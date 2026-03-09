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
          channelId = await resolveChannelId(comp.channel_url, apiKey);
        }

        if (!channelId) {
          errors.push(`Could not resolve channel ID for "${comp.channel_name}"`);
          continue;
        }

        // Fetch channel statistics (costs 1 quota unit)
        const statsUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`;
        const statsRes = await fetch(statsUrl);
        if (!statsRes.ok) {
          const errBody = await statsRes.text();
          errors.push(`Stats fetch failed for "${comp.channel_name}": ${errBody}`);
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
          errors.push(`DB update failed for "${comp.channel_name}": ${updateError.message}`);
          continue;
        }

        synced++;
      } catch (e) {
        errors.push(`Error processing "${comp.channel_name}": ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, synced, total: competitors.length, errors: errors.length > 0 ? errors : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/** Resolve a YouTube channel ID from a URL like youtube.com/@handle or youtube.com/channel/UCxxx */
async function resolveChannelId(url: string, apiKey: string): Promise<string | null> {
  // Direct channel ID in URL
  const channelMatch = url.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/);
  if (channelMatch) return channelMatch[1];

  // @handle format — use forHandle parameter (costs 1 unit, much cheaper than search)
  const handleMatch = url.match(/youtube\.com\/@([^/?&]+)/);
  if (handleMatch) {
    const handle = handleMatch[1];
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.items?.[0]?.id) return data.items[0].id;
    }
  }

  // /c/CustomName or /user/Username format
  const customMatch = url.match(/youtube\.com\/(?:c|user)\/([^/?&]+)/);
  if (customMatch) {
    const username = customMatch[1];
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${encodeURIComponent(username)}&key=${apiKey}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.items?.[0]?.id) return data.items[0].id;
    }
  }

  return null;
}
