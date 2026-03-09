import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { workspace_id } = await req.json();
    if (!workspace_id) throw new Error("Missing workspace_id");

    // Get YouTube API key from workspace integrations
    const { data: integration } = await supabase
      .from("workspace_integrations")
      .select("config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "youtube")
      .eq("enabled", true)
      .single();

    if (!integration?.config?.api_key) {
      return new Response(
        JSON.stringify({ success: false, error: "YouTube API not configured. Add your API key in Settings → Integrations." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = integration.config.api_key;

    // Get all competitors for this workspace
    const { data: competitors } = await supabase
      .from("competitor_channels")
      .select("*")
      .eq("workspace_id", workspace_id);

    if (!competitors?.length) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, message: "No competitors to sync" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let synced = 0;
    const errors: string[] = [];

    for (const comp of competitors) {
      try {
        let channelId = comp.youtube_channel_id;

        // Resolve channel ID from URL if not already set
        if (!channelId && comp.channel_url) {
          console.log(`Resolving channel ID for "${comp.channel_name}" from URL: ${comp.channel_url}`);
          channelId = await resolveChannelId(comp.channel_url, apiKey);
          console.log(`Resolved channel ID: ${channelId || "FAILED"}`);
        }

        if (!channelId) {
          errors.push(`Could not resolve channel ID for "${comp.channel_name}". Make sure the URL is correct (e.g. youtube.com/@handle).`);
          continue;
        }

        // Fetch channel statistics (costs 1 quota unit)
        console.log(`Fetching stats for channel ${channelId}`);
        const statsUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`;
        const statsRes = await fetch(statsUrl);
        
        if (!statsRes.ok) {
          const errBody = await statsRes.text();
          console.error(`Stats API error for "${comp.channel_name}": ${statsRes.status} ${errBody}`);
          if (statsRes.status === 403) {
            errors.push(`YouTube API quota exceeded. Please try again later.`);
            break; // Stop processing all competitors if quota is hit
          }
          errors.push(`Stats fetch failed for "${comp.channel_name}": HTTP ${statsRes.status}`);
          continue;
        }

        const statsData = await statsRes.json();
        const channel = statsData.items?.[0];
        if (!channel) {
          errors.push(`No channel data returned for "${comp.channel_name}" (ID: ${channelId})`);
          continue;
        }

        const stats = channel.statistics;
        const subscriberCount = Number(stats.subscriberCount) || 0;
        const videoCount = Number(stats.videoCount) || 0;
        const viewCount = Number(stats.viewCount) || 0;
        const avgViewsPerVideo = videoCount > 0 ? Math.round(viewCount / videoCount) : 0;

        console.log(`Stats for "${comp.channel_name}": subs=${subscriberCount}, videos=${videoCount}, views=${viewCount}`);

        // Update competitor record in database
        const { error: updateError } = await supabase
          .from("competitor_channels")
          .update({
            youtube_channel_id: channelId,
            subscriber_count: subscriberCount,
            video_count: videoCount,
            total_view_count: viewCount,
            avg_views_per_video: avgViewsPerVideo,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", comp.id);

        if (updateError) {
          console.error(`DB update error for "${comp.channel_name}":`, updateError);
          errors.push(`DB update failed for "${comp.channel_name}": ${updateError.message}`);
          continue;
        }

        synced++;
        console.log(`Successfully synced "${comp.channel_name}"`);
      } catch (e) {
        console.error(`Error processing "${comp.channel_name}":`, e);
        errors.push(`Error processing "${comp.channel_name}": ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, synced, total: competitors.length, errors: errors.length > 0 ? errors : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Top-level error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/** Resolve a YouTube channel ID from a URL */
async function resolveChannelId(url: string, apiKey: string): Promise<string | null> {
  // Direct channel ID in URL: youtube.com/channel/UCxxx
  const channelMatch = url.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/);
  if (channelMatch) return channelMatch[1];

  // @handle format — use forHandle parameter
  const handleMatch = url.match(/youtube\.com\/@([^/?&#]+)/);
  if (handleMatch) {
    const handle = handleMatch[1];
    console.log(`Trying forHandle lookup for: ${handle}`);
    
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`
    );
    
    if (!res.ok) {
      const body = await res.text();
      console.error(`forHandle API error (${res.status}): ${body}`);
      
      // If forHandle fails, try search as fallback
      console.log(`Falling back to search API for handle: ${handle}`);
      return await searchForChannel(handle, apiKey);
    }
    
    const data = await res.json();
    if (data.items?.[0]?.id) {
      console.log(`forHandle resolved "${handle}" to ${data.items[0].id}`);
      return data.items[0].id;
    }
    
    // forHandle returned no results, try search
    console.log(`forHandle returned no results for "${handle}", trying search`);
    return await searchForChannel(handle, apiKey);
  }

  // /c/CustomName or /user/Username format
  const customMatch = url.match(/youtube\.com\/(?:c|user)\/([^/?&#]+)/);
  if (customMatch) {
    const username = customMatch[1];
    console.log(`Trying forUsername lookup for: ${username}`);
    
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${encodeURIComponent(username)}&key=${apiKey}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.items?.[0]?.id) return data.items[0].id;
    }
    
    // Fallback to search
    return await searchForChannel(username, apiKey);
  }

  console.log(`Could not parse URL format: ${url}`);
  return null;
}

/** Search for a channel by name as a last resort */
async function searchForChannel(query: string, apiKey: string): Promise<string | null> {
  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=1&key=${apiKey}`;
    const res = await fetch(searchUrl);
    
    if (!res.ok) {
      const body = await res.text();
      console.error(`Search API error (${res.status}): ${body}`);
      return null;
    }
    
    const data = await res.json();
    if (data.items?.[0]?.snippet?.channelId) {
      console.log(`Search resolved "${query}" to ${data.items[0].snippet.channelId}`);
      return data.items[0].snippet.channelId;
    }
    
    // Also check id.channelId format
    if (data.items?.[0]?.id?.channelId) {
      console.log(`Search resolved "${query}" to ${data.items[0].id.channelId}`);
      return data.items[0].id.channelId;
    }
  } catch (e) {
    console.error(`Search fallback error for "${query}":`, e);
  }
  return null;
}
