import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface CompanyLinkedVideo {
  id: string;
  youtube_video_id: string;
  title: string | null;
  views: number;
  likes: number;
  comments: number;
  published_at: string | null;
  estimated_revenue: number;
}

/**
 * Fetches YouTube videos linked to a company via the video_companies junction table.
 * Joins with youtube_video_stats for basic metrics and aggregates ad revenue
 * from youtube_video_analytics (if available).
 */
export function useCompanyLinkedVideos(companyId: string | null | undefined) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["company-linked-videos", workspaceId, companyId],
    queryFn: async (): Promise<CompanyLinkedVideo[]> => {
      if (!workspaceId || !companyId) return [];

      // 1. Get all youtube_video_ids linked to this company
      const { data: links, error: linkErr } = await supabase
        .from("video_companies")
        .select("youtube_video_id")
        .eq("workspace_id", workspaceId)
        .eq("company_id", companyId);

      if (linkErr) throw linkErr;
      if (!links?.length) return [];

      const videoIds = links.map((l) => l.youtube_video_id);

      // 2. Fetch video stats for these IDs
      const { data: stats } = await supabase
        .from("youtube_video_stats" as any)
        .select("youtube_video_id, title, views, likes, comments, published_at")
        .eq("workspace_id", workspaceId)
        .in("youtube_video_id", videoIds);

      const statsMap = new Map<string, any>();
      for (const s of (stats ?? []) as any[]) {
        // Keep latest entry per video (already ordered by fetched_at desc in table)
        if (!statsMap.has(s.youtube_video_id)) {
          statsMap.set(s.youtube_video_id, s);
        }
      }

      // 3. Fetch aggregated ad revenue from youtube_video_analytics
      const { data: analytics } = await supabase
        .from("youtube_video_analytics" as any)
        .select("youtube_video_id, estimated_revenue")
        .eq("workspace_id", workspaceId)
        .in("youtube_video_id", videoIds);

      const revenueMap = new Map<string, number>();
      for (const a of (analytics ?? []) as any[]) {
        revenueMap.set(
          a.youtube_video_id,
          (revenueMap.get(a.youtube_video_id) ?? 0) + (Number(a.estimated_revenue) || 0)
        );
      }

      // 4. Combine
      return videoIds.map((vid) => {
        const s = statsMap.get(vid);
        return {
          id: vid,
          youtube_video_id: vid,
          title: s?.title ?? null,
          views: s?.views ?? 0,
          likes: s?.likes ?? 0,
          comments: s?.comments ?? 0,
          published_at: s?.published_at ?? null,
          estimated_revenue: revenueMap.get(vid) ?? 0,
        };
      });
    },
    enabled: !!workspaceId && !!companyId,
  });
}
