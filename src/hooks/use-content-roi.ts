import { useMemo } from "react";
import { useContentRevenue, type ContentRevenueLink } from "@/hooks/use-content-revenue";
import { useVideoQueue } from "@/hooks/use-video-queue";

export interface ContentROI {
  videoTitle: string;
  videoQueueId: number;
  youtubeVideoId?: string;
  productionCost: number;
  totalRevenue: number;
  adRevenue: number;
  dealRevenue: number;
  affiliateRevenue: number;
  profit: number;
  roi: number;
  breakEvenViews: number;
  views: number;
}

export interface ContentROISummary {
  items: ContentROI[];
  avgROI: number;
  totalInvested: number;
  totalRevenue: number;
  totalProfit: number;
  bestROIVideo: ContentROI | null;
  worstROIVideo: ContentROI | null;
}

export function useContentROI() {
  const { data: revenueSummary, isLoading: revenueLoading } = useContentRevenue();
  const { data: videos = [], isLoading: queueLoading } = useVideoQueue();

  const summary = useMemo((): ContentROISummary | null => {
    if (!revenueSummary?.links) return null;

    const revenueByQueueId = new Map<number, ContentRevenueLink>();
    for (const link of revenueSummary.links) {
      revenueByQueueId.set(link.videoQueueId, link);
    }

    const items: ContentROI[] = [];

    for (const video of videos) {
      const cost = (video.metadata as any)?.productionCost;
      if (!cost || cost <= 0) continue;

      const revenue = revenueByQueueId.get(Number(video.id));
      const totalRevenue = revenue?.totalRevenue ?? 0;
      const profit = totalRevenue - cost;
      const roi = ((totalRevenue - cost) / cost) * 100;
      const revenuePerView = revenue?.revenuePerView ?? 0;
      const breakEvenViews = revenuePerView > 0 ? Math.ceil(cost / revenuePerView) : 0;

      items.push({
        videoTitle: video.title,
        videoQueueId: Number(video.id),
        youtubeVideoId: video.youtubeVideoId ?? undefined,
        productionCost: cost,
        totalRevenue,
        adRevenue: revenue?.adRevenue ?? 0,
        dealRevenue: revenue?.dealRevenue ?? 0,
        affiliateRevenue: revenue?.affiliateRevenue ?? 0,
        profit,
        roi,
        breakEvenViews,
        views: revenue?.views ?? 0,
      });
    }

    items.sort((a, b) => b.roi - a.roi);

    const totalInvested = items.reduce((s, i) => s + i.productionCost, 0);
    const totalRevenue = items.reduce((s, i) => s + i.totalRevenue, 0);
    const totalProfit = items.reduce((s, i) => s + i.profit, 0);
    const avgROI = items.length > 0 ? items.reduce((s, i) => s + i.roi, 0) / items.length : 0;

    return {
      items,
      avgROI,
      totalInvested,
      totalRevenue,
      totalProfit,
      bestROIVideo: items[0] ?? null,
      worstROIVideo: items.length > 0 ? items[items.length - 1] : null,
    };
  }, [revenueSummary, videos]);

  return { data: summary, isLoading: revenueLoading || queueLoading };
}
