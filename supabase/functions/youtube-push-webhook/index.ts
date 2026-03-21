import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * YouTube PubSubHubbub / Push Notification Webhook
 * ─────────────────────────────────────────────────
 * Handles two flows:
 *  GET  → hub verification (returns hub.challenge)
 *  POST → Atom feed notification (new/updated/deleted video)
 *
 * On receipt it enqueues a row into `webhook_sync_queue` for
 * the affected workspace so the incremental sync processor
 * can fetch only the changed video's metadata + comments.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // ── CORS preflight ──────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // ── GET: Hub verification ───────────────────────────────────────
  if (req.method === "GET") {
    const challenge = url.searchParams.get("hub.challenge");
    const mode = url.searchParams.get("hub.mode");
    console.log(`[YT Webhook] Verification: mode=${mode}`);

    if (challenge) {
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain", ...corsHeaders },
      });
    }
    return new Response("Missing hub.challenge", { status: 400, headers: corsHeaders });
  }

  // ── POST: Atom feed notification ────────────────────────────────
  if (req.method === "POST") {
    try {
      const body = await req.text();
      console.log(`[YT Webhook] Received notification (${body.length} bytes)`);

      // Parse the Atom XML to extract video ID and channel ID
      const videoIdMatch = body.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const channelIdMatch = body.match(/<yt:channelId>([^<]+)<\/yt:channelId>/);
      const titleMatch = body.match(/<title>([^<]+)<\/title>/);
      const deletedMatch = body.match(/<at:deleted-entry/);
      const updatedMatch = body.match(/<updated>([^<]+)<\/updated>/);
      const publishedMatch = body.match(/<published>([^<]+)<\/published>/);

      const videoId = videoIdMatch?.[1];
      const channelId = channelIdMatch?.[1];
      const title = titleMatch?.[1] || "Unknown";

      if (!videoId || !channelId) {
        console.warn("[YT Webhook] Could not parse video/channel ID from notification");
        return new Response(JSON.stringify({ ok: false, reason: "unparseable" }), {
          status: 200, // Return 200 so hub doesn't retry
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Determine event type
      let eventType = "video_updated";
      if (deletedMatch) {
        eventType = "video_deleted";
      } else if (publishedMatch && updatedMatch) {
        const published = new Date(publishedMatch[1]).getTime();
        const updated = new Date(updatedMatch[1]).getTime();
        // If published within the last 10 minutes of updated, treat as new
        if (Math.abs(updated - published) < 10 * 60 * 1000) {
          eventType = "new_video";
        }
      }

      console.log(`[YT Webhook] Event: ${eventType}, videoId=${videoId}, channelId=${channelId}, title=${title}`);

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Look up which workspace owns this channel
      const { data: integrations } = await supabase
        .from("workspace_integrations")
        .select("workspace_id, config")
        .eq("integration_key", "youtube")
        .eq("enabled", true);

      const matchedWorkspaces = (integrations ?? []).filter((i: any) => {
        const cfg = i.config as Record<string, any>;
        return cfg?.channel_id === channelId;
      });

      if (matchedWorkspaces.length === 0) {
        console.warn(`[YT Webhook] No workspace found for channelId=${channelId}`);
        return new Response(JSON.stringify({ ok: true, matched: 0 }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Enqueue sync items — one per workspace (dedup: skip if pending/processing exists)
      let enqueued = 0;
      for (const ws of matchedWorkspaces) {
        // Check for existing pending/processing entry (dedup)
        const { data: existing } = await supabase
          .from("webhook_sync_queue")
          .select("id")
          .eq("workspace_id", ws.workspace_id)
          .eq("entity_id", videoId)
          .eq("event_type", eventType)
          .in("status", ["pending", "processing"])
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`[YT Webhook] Skipping dedup for ws=${ws.workspace_id}, videoId=${videoId}`);
          continue;
        }

        const { error } = await supabase.from("webhook_sync_queue").insert({
          workspace_id: ws.workspace_id,
          event_type: eventType,
          entity_id: videoId,
          payload: { channelId, title, raw_length: body.length },
          status: "pending",
        });

        if (error) {
          console.error(`[YT Webhook] Failed to enqueue: ${error.message}`);
        } else {
          enqueued++;
        }
      }

      console.log(`[YT Webhook] Enqueued ${enqueued} sync tasks for videoId=${videoId}`);

      return new Response(
        JSON.stringify({ ok: true, event: eventType, videoId, enqueued }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err: any) {
      console.error("[YT Webhook] Error:", err.message);
      // Still return 200 to prevent hub retries on transient errors
      return new Response(
        JSON.stringify({ ok: false, error: err.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
