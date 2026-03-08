import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useYouTubeVideoStats } from "@/hooks/use-youtube-analytics";
import { useMemo } from "react";

export interface RevenueAttribution {
  youtube_video_id: string;
  video_title: string;
  ad_revenue: number;
  sponsor_revenue: number;
  affiliate_revenue: number;
  total_revenue: number;
  views: number;
  rpm: number;
}

export function useRevenueAttribution() {
  const { workspaceId } = useWorkspace();
  const { data: videos = [], isLoading: videosLoading } = useYouTubeVideoStats(100);

  const { data: videoCompanies = [] } = useQuery({
    queryKey: ["video-companies-revenue", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase
        .from("video_companies")
        .select("youtube_video_id, company_id")
        .eq("workspace_id", workspaceId);
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["deals-for-attribution", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase
        .from("deals")
        .select("company_id, value, stage")
        .eq("workspace_id", workspaceId)
        .in("stage", ["closed_won", "negotiation", "proposal"]);
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const attribution = useMemo((): RevenueAttribution[] => {
    const companyRevenue = new Map<string, number>();
    for (const d of deals) {
      if (d.company_id && d.value) {
        companyRevenue.set(d.company_id, (companyRevenue.get(d.company_id) ?? 0) + Number(d.value));
      }
    }

    const videoSponsorRevenue = new Map<string, number>();
    for (const vc of videoCompanies) {
      const rev = companyRevenue.get(vc.company_id) ?? 0;
      if (rev > 0) {
        videoSponsorRevenue.set(vc.youtube_video_id, (videoSponsorRevenue.get(vc.youtube_video_id) ?? 0) + rev);
      }
    }

    return videos
      .map((v) => {
        // watch_time_minutes as a proxy for ad revenue estimate (no direct field)
        const adRevenue = v.watch_time_minutes * 0.01; // rough RPM estimate
        const sponsorRevenue = videoSponsorRevenue.get(v.youtube_video_id) ?? 0;
        const totalRevenue = adRevenue + sponsorRevenue;
        return {
          youtube_video_id: v.youtube_video_id,
          video_title: v.title,
          ad_revenue: adRevenue,
          sponsor_revenue: sponsorRevenue,
          affiliate_revenue: 0,
          total_revenue: totalRevenue,
          views: v.views,
          rpm: v.views > 0 ? (totalRevenue / v.views) * 1000 : 0,
        };
      })
      .filter((v) => v.total_revenue > 0)
      .sort((a, b) => b.total_revenue - a.total_revenue);
  }, [videos, videoCompanies, deals]);

  return { data: attribution, isLoading: videosLoading };
}
