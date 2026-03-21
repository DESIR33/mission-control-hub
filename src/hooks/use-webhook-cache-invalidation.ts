import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

/**
 * Subscribes to Supabase Realtime on `webhook_sync_queue` and
 * invalidates only the React Query caches relevant to the completed event.
 *
 * Mount this once at the app shell level.
 */
export function useWebhookCacheInvalidation() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel("webhook-sync-done")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "webhook_sync_queue",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload: any) => {
          const row = payload.new;
          if (row.status !== "done") return;

          const eventType: string = row.event_type;
          console.log(`[Webhook Invalidation] Event done: ${eventType}, entity=${row.entity_id}`);

          // Always invalidate video stats
          qc.invalidateQueries({ queryKey: ["youtube-video-stats"] });
          qc.invalidateQueries({ queryKey: ["youtube_video_stats"] });
          qc.invalidateQueries({ queryKey: ["dataset-sync-status"] });

          if (eventType === "new_video") {
            // New video → also refresh channel stats, video queue, comments
            qc.invalidateQueries({ queryKey: ["youtube-channel-stats"] });
            qc.invalidateQueries({ queryKey: ["youtube_channel_stats"] });
            qc.invalidateQueries({ queryKey: ["youtube_comments"] });
            qc.invalidateQueries({ queryKey: ["video-queue"] });
            qc.invalidateQueries({ queryKey: ["growth_goals"] });
          } else if (eventType === "video_updated") {
            // Metadata change — title map and sponsored videos may be affected
            qc.invalidateQueries({ queryKey: ["video-title-map"] });
            qc.invalidateQueries({ queryKey: ["sponsored-videos"] });
          }
          // video_deleted: stats remain, no extra invalidation needed
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, qc]);
}
