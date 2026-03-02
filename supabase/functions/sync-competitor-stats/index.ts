import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    // Get YouTube API key
    const { data: integration } = await supabase
      .from("workspace_integrations")
      .select("config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "youtube")
      .eq("enabled", true)
      .single();

    if (!integration?.config?.api_key) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, message: "YouTube API not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    for (const comp of competitors) {
      try {
        let channelId = comp.youtube_channel_id;

        // Try to resolve channel ID from URL if not set
        if (!channelId && comp.channel_url) {
          // Extract from various URL formats
          const urlMatch = comp.channel_url.match(
            /(?:youtube\.com\/(?:channel\/|@|c\/))([^/?&]+)/
          );
          if (urlMatch) {
            const identifier = urlMatch[1];
            // If it starts with UC, it's already a channel ID
            if (identifier.startsWith("UC")) {
              channelId = identifier;
            } else {
              // Try searching for the channel
              const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(identifier)}&maxResults=1&key=${apiKey}`;
              const searchRes = await fetch(searchUrl);
              if (searchRes.ok) {
                const searchData = await searchRes.json();
                if (searchData.items?.[0]) {
                  channelId = searchData.items[0].snippet.channelId;
                }
              }
            }
          }
        }

        if (!channelId) continue;

        // Fetch channel stats
        const statsUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`;
        const statsRes = await fetch(statsUrl);
        if (!statsRes.ok) continue;

        const statsData = await statsRes.json();
        const channel = statsData.items?.[0];
        if (!channel) continue;

        const stats = channel.statistics;

        // Fetch recent videos for avg views
        const videosUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=10&key=${apiKey}`;
        const videosRes = await fetch(videosUrl);
        let avgViews = comp.avg_views_per_video || 0;

        if (videosRes.ok) {
          const videosData = await videosRes.json();
          const videoIds = (videosData.items || [])
            .map((v: { id?: { videoId?: string } }) => v.id?.videoId)
            .filter(Boolean)
            .join(",");

          if (videoIds) {
            const videoStatsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`;
            const videoStatsRes = await fetch(videoStatsUrl);
            if (videoStatsRes.ok) {
              const videoStatsData = await videoStatsRes.json();
              const views = (videoStatsData.items || []).map(
                (v: { statistics?: { viewCount?: string } }) =>
                  Number(v.statistics?.viewCount || 0)
              );
              if (views.length > 0) {
                avgViews = Math.round(
                  views.reduce((a: number, b: number) => a + b, 0) / views.length
                );
              }
            }
          }
        }

        // Update competitor record
        await supabase
          .from("competitor_channels")
          .update({
            youtube_channel_id: channelId,
            subscriber_count: Number(stats.subscriberCount) || comp.subscriber_count,
            video_count: Number(stats.videoCount) || comp.video_count,
            total_view_count: Number(stats.viewCount) || comp.total_view_count,
            avg_views_per_video: avgViews,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", comp.id);

        synced++;
      } catch {
        // Continue to next competitor on error
      }
    }

    return new Response(
      JSON.stringify({ success: true, synced }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
