import { useMemo } from "react";
import { useVideoAnalytics } from "@/hooks/use-youtube-analytics-api";

export interface SubscriberImpact {
  youtubeVideoId: string;
  title: string;
  views: number;
  subsGained: number;
  subsLost: number;
  netSubscribers: number;
  subConversionRate: number;
  subsPerThousandViews: number;
}

export interface SubscriberImpactSummary {
  items: SubscriberImpact[];
  totalNetSubs: number;
  avgSubConversionRate: number;
  topSubMagnet: SubscriberImpact | null;
  bestConverter: SubscriberImpact | null;
}

export function useSubscriberImpact() {
  const { data: analytics = [] } = useVideoAnalytics(180);

  const summary = useMemo((): SubscriberImpactSummary | null => {
    if (!analytics.length) return null;

    // Group by video
    const videoMap = new Map<string, { title: string; views: number; subsGained: number; subsLost: number }>();
    for (const row of analytics) {
      const existing = videoMap.get(row.youtube_video_id) ?? {
        title: row.title,
        views: 0,
        subsGained: 0,
        subsLost: 0,
      };
      existing.views += row.views;
      existing.subsGained += row.subscribers_gained;
      existing.subsLost += row.subscribers_lost;
      if (row.title) existing.title = row.title;
      videoMap.set(row.youtube_video_id, existing);
    }

    const items: SubscriberImpact[] = Array.from(videoMap.entries()).map(([videoId, data]) => {
      const netSubscribers = data.subsGained - data.subsLost;
      const subConversionRate = data.views > 0 ? (netSubscribers / data.views) * 100 : 0;
      const subsPerThousandViews = data.views > 0 ? (netSubscribers / data.views) * 1000 : 0;

      return {
        youtubeVideoId: videoId,
        title: data.title,
        views: data.views,
        subsGained: data.subsGained,
        subsLost: data.subsLost,
        netSubscribers,
        subConversionRate,
        subsPerThousandViews,
      };
    });

    items.sort((a, b) => b.netSubscribers - a.netSubscribers);

    const totalNetSubs = items.reduce((s, i) => s + i.netSubscribers, 0);
    const withViews = items.filter((i) => i.views > 0);
    const avgSubConversionRate = withViews.length > 0
      ? withViews.reduce((s, i) => s + i.subConversionRate, 0) / withViews.length
      : 0;

    const topSubMagnet = items[0] ?? null;
    const bestConverter = [...items]
      .filter((i) => i.views >= 1000)
      .sort((a, b) => b.subConversionRate - a.subConversionRate)[0] ?? null;

    return {
      items,
      totalNetSubs,
      avgSubConversionRate,
      topSubMagnet,
      bestConverter,
    };
  }, [analytics]);

  return { data: summary };
}
