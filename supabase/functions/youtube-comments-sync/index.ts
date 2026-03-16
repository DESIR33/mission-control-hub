import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin, getIntegrationConfig } from "../_shared/supabase-admin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = getSupabaseAdmin();

    const { workspace_id } = await req.json();
    if (!workspace_id) throw new Error("Missing workspace_id");

    // Get YouTube API key from integrations
    const config = await getIntegrationConfig(supabase, workspace_id, "youtube");

    if (!config?.api_key) {
      return jsonResponse({ success: true, synced: 0, message: "YouTube API not configured" });
    }

    const apiKey = config.api_key;

    // Get recent videos
    const { data: videos } = await supabase
      .from("youtube_video_stats")
      .select("youtube_video_id, title")
      .eq("workspace_id", workspace_id)
      .order("published_at", { ascending: false })
      .limit(10);

    if (!videos?.length) {
      return jsonResponse({ success: true, synced: 0, message: "No videos found" });
    }

    let totalSynced = 0;

    for (const video of videos) {
      try {
        const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${video.youtube_video_id}&maxResults=50&order=time&key=${apiKey}`;
        const res = await fetch(url);

        if (!res.ok) continue;

        const data = await res.json();
        const items = data.items || [];
        if (!items.length) continue;

        // Collect all comment IDs for this video to batch-check existing ones
        const commentIds = items
          .map((item: any) => item.snippet?.topLevelComment?.id)
          .filter(Boolean);

        // Single query to find all existing comments instead of per-comment lookups
        const { data: existingComments } = await supabase
          .from("youtube_comments")
          .select("id, youtube_comment_id, status")
          .eq("workspace_id", workspace_id)
          .in("youtube_comment_id", commentIds);

        const existingMap = new Map(
          (existingComments ?? []).map((c: any) => [c.youtube_comment_id, c])
        );

        const toInsert: any[] = [];
        const toUpdate: { id: string; like_count: number; reply_count: number; synced_at: string }[] = [];

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

          const ytCommentId = item.snippet.topLevelComment.id;
          const now = new Date().toISOString();
          const existing = existingMap.get(ytCommentId);

          if (existing) {
            toUpdate.push({
              id: existing.id,
              like_count: snippet.likeCount || 0,
              reply_count: item.snippet.totalReplyCount || 0,
              synced_at: now,
            });
          } else {
            toInsert.push({
              workspace_id,
              youtube_comment_id: ytCommentId,
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
              synced_at: now,
            });
          }
        }

        // Batch insert new comments
        if (toInsert.length > 0) {
          await supabase.from("youtube_comments").insert(toInsert);
          totalSynced += toInsert.length;
        }

        // Batch update existing comments
        for (const u of toUpdate) {
          await supabase
            .from("youtube_comments")
            .update({ like_count: u.like_count, reply_count: u.reply_count, synced_at: u.synced_at })
            .eq("id", u.id);
        }
      } catch {
        // Continue to next video on error
      }
    }

    return jsonResponse({ success: true, synced: totalSynced });
  } catch (error: unknown) {
    return errorResponse(error);
  }
});
