import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * youtube-webhook-processor
 * ─────────────────────────
 * Picks up pending items from `webhook_sync_queue` and runs
 * targeted incremental syncs (single-video metadata + comments).
 * Called by a pg_cron job every 5 minutes.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ITEMS = 10;
const MAX_ATTEMPTS = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Grab pending items
  const { data: items, error: fetchErr } = await supabase
    .from("webhook_sync_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(MAX_ITEMS);

  if (fetchErr) {
    console.error("[Webhook Processor] Fetch error:", fetchErr.message);
    return new Response(JSON.stringify({ ok: false, error: fetchErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!items || items.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[Webhook Processor] Processing ${items.length} items`);

  let processed = 0;
  let failed = 0;

  for (const item of items) {
    // Mark as processing
    await supabase
      .from("webhook_sync_queue")
      .update({ status: "processing", attempts: item.attempts + 1 })
      .eq("id", item.id);

    try {
      const workspaceId = item.workspace_id;
      const videoId = item.entity_id;
      const eventType = item.event_type;

      // Get YouTube integration config
      const { data: integration } = await supabase
        .from("workspace_integrations")
        .select("config")
        .eq("workspace_id", workspaceId)
        .eq("integration_key", "youtube")
        .eq("enabled", true)
        .single();

      if (!integration?.config) {
        throw new Error("YouTube integration not configured");
      }

      const config = integration.config as Record<string, any>;
      const apiKey = config.api_key;

      if (!apiKey) throw new Error("Missing YouTube API key");

      if (eventType === "video_deleted") {
        // Soft-handle: mark in youtube_video_stats if exists
        console.log(`[Webhook Processor] Video deleted: ${videoId} (no action needed — stats remain)`);
      } else {
        // Fetch single video metadata
        const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`;
        const videoRes = await fetch(videoUrl);
        const videoData = await videoRes.json();

        if (videoData.items?.length > 0) {
          const v = videoData.items[0];
          const snippet = v.snippet || {};
          const stats = v.statistics || {};

          // Upsert video stats
          await supabase.from("youtube_video_stats").upsert(
            {
              workspace_id: workspaceId,
              youtube_video_id: videoId,
              title: snippet.title || "Untitled",
              description: snippet.description || "",
              thumbnail_url: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || "",
              published_at: snippet.publishedAt,
              view_count: parseInt(stats.viewCount || "0"),
              like_count: parseInt(stats.likeCount || "0"),
              comment_count: parseInt(stats.commentCount || "0"),
              duration: v.contentDetails?.duration || "",
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id,youtube_video_id" }
          );

          console.log(`[Webhook Processor] Upserted video stats for ${videoId}: "${snippet.title}"`);

          // Bootstrap comments for new videos (fetch top 20)
          if (eventType === "new_video") {
            try {
              const commentsUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&order=relevance&key=${apiKey}`;
              const commentsRes = await fetch(commentsUrl);
              const commentsData = await commentsRes.json();

              if (commentsData.items?.length > 0) {
                const commentRows = commentsData.items.map((c: any) => {
                  const cs = c.snippet?.topLevelComment?.snippet || {};
                  return {
                    workspace_id: workspaceId,
                    youtube_video_id: videoId,
                    comment_id: c.snippet?.topLevelComment?.id || c.id,
                    author_name: cs.authorDisplayName || "Unknown",
                    author_channel_id: cs.authorChannelId?.value || null,
                    author_profile_image: cs.authorProfileImageUrl || null,
                    text: cs.textDisplay || "",
                    like_count: cs.likeCount || 0,
                    published_at: cs.publishedAt,
                    is_reply: false,
                  };
                });

                await supabase.from("youtube_comments").upsert(commentRows, {
                  onConflict: "workspace_id,comment_id",
                });
                console.log(`[Webhook Processor] Bootstrapped ${commentRows.length} comments for new video ${videoId}`);
              }
            } catch (commentErr: any) {
              console.warn(`[Webhook Processor] Comment bootstrap failed: ${commentErr.message}`);
              // Non-fatal — video was still synced
            }
          }
        } else {
          console.warn(`[Webhook Processor] Video not found via API: ${videoId}`);
        }
      }

      // Mark done
      await supabase
        .from("webhook_sync_queue")
        .update({ status: "done", processed_at: new Date().toISOString() })
        .eq("id", item.id);

      // Record in dataset_sync_status
      await supabase.rpc("record_dataset_sync", {
        p_workspace_id: workspaceId,
        p_dataset_key: "youtubeVideoStats",
        p_triggered_by: "webhook",
        p_cooldown_hours: 1,
      });

      processed++;
    } catch (err: any) {
      console.error(`[Webhook Processor] Failed item ${item.id}: ${err.message}`);
      const newStatus = item.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending";
      await supabase
        .from("webhook_sync_queue")
        .update({ status: newStatus, last_error: err.message })
        .eq("id", item.id);
      failed++;
    }
  }

  console.log(`[Webhook Processor] Done: ${processed} processed, ${failed} failed`);

  return new Response(
    JSON.stringify({ ok: true, processed, failed }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
