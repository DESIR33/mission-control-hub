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

    // Get YouTube API key from integrations
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

    // Get recent videos
    const { data: videos } = await supabase
      .from("youtube_video_stats")
      .select("youtube_video_id, title")
      .eq("workspace_id", workspace_id)
      .order("published_at", { ascending: false })
      .limit(10);

    if (!videos?.length) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, message: "No videos found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalSynced = 0;

    for (const video of videos) {
      try {
        const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${video.youtube_video_id}&maxResults=50&order=time&key=${apiKey}`;
        const res = await fetch(url);

        if (!res.ok) continue;

        const data = await res.json();
        const items = data.items || [];

        for (const item of items) {
          const snippet = item.snippet?.topLevelComment?.snippet;
          if (!snippet) continue;

          // Basic sentiment classification
          const text = (snippet.textDisplay || "").toLowerCase();
          let sentiment: string = "neutral";
          if (text.includes("?")) {
            sentiment = "question";
          } else if (/\b(great|amazing|love|awesome|best|fantastic|excellent|thank|helpful|incredible)\b/.test(text)) {
            sentiment = "positive";
          } else if (/\b(bad|hate|worst|terrible|awful|horrible|disappointing|sucks|trash)\b/.test(text)) {
            sentiment = "negative";
          }

          const commentData = {
            workspace_id,
            youtube_comment_id: item.snippet.topLevelComment.id,
            youtube_video_id: video.youtube_video_id,
            video_title: video.title,
            author_name: snippet.authorDisplayName || "Unknown",
            author_channel_url: snippet.authorChannelUrl || null,
            author_avatar_url: snippet.authorProfileImageUrl || null,
            text_display: snippet.textDisplay || "",
            like_count: snippet.likeCount || 0,
            reply_count: item.snippet.totalReplyCount || 0,
            is_pinned: false,
            is_hearted: false,
            sentiment,
            published_at: snippet.publishedAt,
            synced_at: new Date().toISOString(),
          };

          // Upsert — update if exists, insert if new
          const { data: existing } = await supabase
            .from("youtube_comments")
            .select("id, status")
            .eq("workspace_id", workspace_id)
            .eq("youtube_comment_id", commentData.youtube_comment_id)
            .maybeSingle();

          if (existing) {
            // Update stats but keep existing status
            await supabase
              .from("youtube_comments")
              .update({
                like_count: commentData.like_count,
                reply_count: commentData.reply_count,
                synced_at: commentData.synced_at,
              })
              .eq("id", existing.id);
          } else {
            await supabase.from("youtube_comments").insert(commentData);
            totalSynced++;
          }
        }
      } catch {
        // Continue to next video on error
      }
    }

    return new Response(
      JSON.stringify({ success: true, synced: totalSynced }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
