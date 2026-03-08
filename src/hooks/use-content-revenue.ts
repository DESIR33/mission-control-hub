import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useMemo } from "react";
import { useVideoAnalytics } from "@/hooks/use-youtube-analytics-api";

export interface ContentRevenueLink {
  videoTitle: string;
  videoQueueId: number;
  youtubeVideoId?: string;
  adRevenue: number;
  dealRevenue: number;
  affiliateRevenue: number;
  totalRevenue: number;
  views: number;
  revenuePerView: number;
  roi: number;
}

export interface ContentRevenueSummary {
  links: ContentRevenueLink[];
  totalAdRevenue: number;
  totalDealRevenue: number;
  totalAffiliateRevenue: number;
  grandTotal: number;
  avgRevenuePerVideo: number;
  topEarner: ContentRevenueLink | null;
  revenueBySource: { source: string; amount: number }[];
}

export function useContentRevenue(days = 180) {
  const { workspaceId } = useWorkspace();
  const { data: videoAnalytics = [] } = useVideoAnalytics(days);

  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ["content-revenue-deals", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals" as any)
        .select("id, title, value, stage, company_id")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: affiliateTxns = [], isLoading: affLoading } = useQuery({
    queryKey: ["content-revenue-affiliates", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_transactions" as any)
        .select("id, amount, video_queue_id, status")
        .eq("workspace_id", workspaceId!)
        .not("video_queue_id", "is", null);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: videoQueue = [], isLoading: queueLoading } = useQuery({
    queryKey: ["content-revenue-queue", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_queue" as any)
        .select("id, title, youtube_video_id")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const summary = useMemo((): ContentRevenueSummary | null => {
    if (!videoQueue.length) return null;

    const adRevenueByVideoId = new Map<string, number>();
    const viewsByVideoId = new Map<string, number>();
    videoAnalytics.forEach((v) => {
      adRevenueByVideoId.set(
        v.youtube_video_id,
        (adRevenueByVideoId.get(v.youtube_video_id) ?? 0) + v.estimated_revenue
      );
      viewsByVideoId.set(
        v.youtube_video_id,
        (viewsByVideoId.get(v.youtube_video_id) ?? 0) + v.views
      );
    });

    const links: ContentRevenueLink[] = videoQueue.map((vq: any) => {
      const dealRevenue = deals
        .filter((d: any) => d.video_queue_id === vq.id && d.stage === "closed_won")
        .reduce((s: number, d: any) => s + (Number(d.value) || 0), 0);

      const affiliateRevenue = affiliateTxns
        .filter((t: any) => t.video_queue_id === vq.id && t.status !== "cancelled")
        .reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);

      const adRevenue = vq.youtube_video_id ? (adRevenueByVideoId.get(vq.youtube_video_id) ?? 0) : 0;
      const views = vq.youtube_video_id ? (viewsByVideoId.get(vq.youtube_video_id) ?? 0) : 0;
      const totalRevenue = adRevenue + dealRevenue + affiliateRevenue;

      return {
        videoTitle: vq.title,
        videoQueueId: vq.id,
        youtubeVideoId: vq.youtube_video_id ?? undefined,
        adRevenue,
        dealRevenue,
        affiliateRevenue,
        totalRevenue,
        views,
        revenuePerView: views > 0 ? totalRevenue / views : 0,
        roi: 0,
      };
    });

    links.sort((a, b) => b.totalRevenue - a.totalRevenue);
    const withRevenue = links.filter((l) => l.totalRevenue > 0);

    const totalAdRevenue = withRevenue.reduce((s, l) => s + l.adRevenue, 0);
    const totalDealRevenue = withRevenue.reduce((s, l) => s + l.dealRevenue, 0);
    const totalAffiliateRevenue = withRevenue.reduce((s, l) => s + l.affiliateRevenue, 0);
    const grandTotal = totalAdRevenue + totalDealRevenue + totalAffiliateRevenue;

    return {
      links: withRevenue.slice(0, 50),
      totalAdRevenue,
      totalDealRevenue,
      totalAffiliateRevenue,
      grandTotal,
      avgRevenuePerVideo: withRevenue.length > 0 ? grandTotal / withRevenue.length : 0,
      topEarner: withRevenue[0] ?? null,
      revenueBySource: [
        { source: "Ad Revenue", amount: totalAdRevenue },
        { source: "Sponsorships", amount: totalDealRevenue },
        { source: "Affiliates", amount: totalAffiliateRevenue },
      ],
    };
  }, [videoQueue, deals, affiliateTxns, videoAnalytics]);

  return { data: summary, isLoading: dealsLoading || affLoading || queueLoading };
}
