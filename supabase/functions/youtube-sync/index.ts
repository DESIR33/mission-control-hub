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

    // Get YouTube integration config
    const { data: integration, error: intError } = await supabase
      .from("workspace_integrations")
      .select("config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "youtube")
      .eq("enabled", true)
      .single();

    if (intError || !integration?.config) {
      throw new Error("YouTube integration not configured. Go to Integrations to set up your API key and channel ID.");
    }

    const apiKey = integration.config.api_key;
    const channelId = integration.config.channel_id;

    if (!apiKey || !channelId) {
      throw new Error("Missing YouTube API key or channel ID in integration config.");
    }

    // Fetch channel statistics
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`;
    const channelRes = await fetch(channelUrl);
    const channelData = await channelRes.json();

    if (!channelRes.ok || !channelData.items?.length) {
      throw new Error(`YouTube API error: ${channelData.error?.message || "Channel not found"}`);
    }

    const channel = channelData.items[0];
    const stats = channel.statistics;

    const subscriberCount = parseInt(stats.subscriberCount, 10) || 0;
    const videoCount = parseInt(stats.videoCount, 10) || 0;
    const totalViewCount = parseInt(stats.viewCount, 10) || 0;

    // Insert channel stats snapshot
    const { error: insertError } = await supabase
      .from("youtube_channel_stats")
      .insert({
        workspace_id,
        subscriber_count: subscriberCount,
        video_count: videoCount,
        total_view_count: totalViewCount,
        fetched_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Failed to insert channel stats:", insertError);
    }

    // Update growth goal current_value
    const { data: activeGoal } = await supabase
      .from("growth_goals")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeGoal) {
      await supabase
        .from("growth_goals")
        .update({ current_value: subscriberCount, updated_at: new Date().toISOString() })
        .eq("id", activeGoal.id);
    }

    // Fetch recent videos
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&type=video&order=date&maxResults=20&key=${apiKey}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    let videosSynced = 0;

    if (searchRes.ok && searchData.items?.length) {
      const videoIds = searchData.items
        .map((item: any) => item.id?.videoId)
        .filter(Boolean)
        .join(",");

      if (videoIds) {
        const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoIds}&key=${apiKey}`;
        const videosRes = await fetch(videosUrl);
        const videosData = await videosRes.json();

        if (videosRes.ok && videosData.items?.length) {
          for (const video of videosData.items) {
            const videoStats = video.statistics;

            const { error: upsertError } = await supabase
              .from("youtube_video_stats")
              .upsert(
                {
                  workspace_id,
                  youtube_video_id: video.id,
                  title: video.snippet?.title || "Untitled",
                  views: parseInt(videoStats.viewCount, 10) || 0,
                  likes: parseInt(videoStats.likeCount, 10) || 0,
                  comments: parseInt(videoStats.commentCount, 10) || 0,
                  watch_time_minutes: 0,
                  ctr_percent: 0,
                  published_at: video.snippet?.publishedAt || null,
                  fetched_at: new Date().toISOString(),
                },
                { onConflict: "workspace_id,youtube_video_id" }
              );

            if (!upsertError) videosSynced++;
          }
        }
      }
    }

    const result = {
      success: true,
      channel: {
        subscriber_count: subscriberCount,
        video_count: videoCount,
        total_view_count: totalViewCount,
      },
      videos_synced: videosSynced,
      synced_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
