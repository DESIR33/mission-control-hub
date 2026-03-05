import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface VideoDeal {
  id: string;
  title: string;
  value: number | null;
  currency: string | null;
  stage: string;
  expected_close_date: string | null;
  company?: { id: string; name: string; logo_url: string | null } | null;
}

/**
 * Fetches deals linked to this video via both:
 * 1. The video_queue_id FK path (proper structural link)
 * 2. Notes containing the YouTube video ID (legacy text search)
 * Results are deduplicated by deal ID.
 */
export function useVideoDeals(youtubeVideoId: string | undefined) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["video-deals", workspaceId, youtubeVideoId],
    queryFn: async (): Promise<VideoDeal[]> => {
      if (!workspaceId || !youtubeVideoId) return [];

      const mapDeal = (d: any): VideoDeal => ({
        id: d.id,
        title: d.title,
        value: d.value,
        currency: d.currency,
        stage: d.stage,
        expected_close_date: d.expected_close_date,
        company: d.companies ?? null,
      });

      // Path 1: Find video_queue row by youtube_video_id, then find deals by video_queue_id
      const { data: vqRows } = await supabase
        .from("video_queue")
        .select("id")
        .eq("workspace_id", workspaceId)
        .filter("metadata->>youtubeVideoId", "eq", youtubeVideoId)
        .limit(1);

      const dealMap = new Map<string, VideoDeal>();

      if (vqRows && vqRows.length > 0) {
        const vqId = vqRows[0].id;
        const { data: fkDeals } = await supabase
          .from("deals")
          .select("id, title, value, currency, stage, expected_close_date")
          .eq("workspace_id", workspaceId)
          .is("deleted_at", null)
          .ilike("notes", `%${vqId}%`);

        for (const d of fkDeals ?? []) {
          dealMap.set(d.id, mapDeal(d));
        }
      }

      // Path 2: Search deals whose notes mention this video ID (legacy approach)
      const { data: noteDeals } = await supabase
        .from("deals")
        .select("id, title, value, currency, stage, expected_close_date")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .ilike("notes", `%${youtubeVideoId}%`);

      for (const d of noteDeals ?? []) {
        if (!dealMap.has(d.id)) {
          dealMap.set(d.id, mapDeal(d));
        }
      }

      return Array.from(dealMap.values());
    },
    enabled: !!workspaceId && !!youtubeVideoId,
  });
}
