import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface LinkedVideo {
  title: string;
  youtubeVideoId: string;
  views: number;
  ctr: number;
  subsGained: number;
  estimatedRevenue: number;
  vsAvgViews: number; // percentage vs channel avg
  vsAvgCtr: number;
}

export interface ContactImpactData {
  linkedVideos: LinkedVideo[];
  totalDealValue: number;
  totalAdRevenue: number;
  totalRelationshipValue: number;
  partnershipScore: number; // 0-100
  performanceVsAvg: number; // percentage
}

export function useContactImpact(contactId: string | null) {
  const { workspaceId } = useWorkspace();

  const { data: deals = [] } = useQuery({
    queryKey: ["contact-impact-deals", workspaceId, contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, value, stage, video_queue_id")
        .eq("workspace_id", workspaceId!)
        .eq("contact_id", contactId!)
        .is("deleted_at", null);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId && !!contactId,
  });

  const { data: videoQueue = [] } = useQuery({
    queryKey: ["contact-impact-queue", workspaceId, contactId],
    queryFn: async () => {
      const queueIds = deals.filter((d: any) => d.video_queue_id).map((d: any) => d.video_queue_id);
      if (!queueIds.length) return [];
      const { data, error } = await supabase
        .from("video_queue")
        .select("id, title, youtube_video_id")
        .in("id", queueIds);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: deals.length > 0,
  });

  const { data: videoAnalytics = [] } = useQuery({
    queryKey: ["contact-impact-analytics", workspaceId, contactId],
    queryFn: async () => {
      const ytIds = videoQueue.filter((v: any) => v.youtube_video_id).map((v: any) => v.youtube_video_id);
      if (!ytIds.length) return [];
      const { data, error } = await supabase
        .from("youtube_video_analytics" as any)
        .select("youtube_video_id, title, views, impressions_ctr, subscribers_gained, estimated_revenue")
        .eq("workspace_id", workspaceId!)
        .in("youtube_video_id", ytIds);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: videoQueue.length > 0,
  });

  const { data: channelAvg } = useQuery({
    queryKey: ["contact-impact-avg", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_video_analytics" as any)
        .select("views, impressions_ctr")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      const rows = (data ?? []) as any[];
      if (!rows.length) return { avgViews: 0, avgCtr: 0 };
      return {
        avgViews: rows.reduce((s, r) => s + (r.views || 0), 0) / rows.length,
        avgCtr: rows.reduce((s, r) => s + (r.impressions_ctr || 0), 0) / rows.length,
      };
    },
    enabled: !!workspaceId,
  });

  const impact = useMemo((): ContactImpactData | null => {
    if (!contactId) return null;

    const avgViews = channelAvg?.avgViews || 1;
    const avgCtr = channelAvg?.avgCtr || 0.05;

    // Aggregate analytics per video
    const analyticsMap = new Map<string, {
      views: number;
      ctr: number;
      subs: number;
      revenue: number;
      count: number;
    }>();

    for (const row of videoAnalytics) {
      const vid = row.youtube_video_id;
      const existing = analyticsMap.get(vid) ?? { views: 0, ctr: 0, subs: 0, revenue: 0, count: 0 };
      existing.views += row.views || 0;
      existing.ctr += row.impressions_ctr || 0;
      existing.subs += row.subscribers_gained || 0;
      existing.revenue += Number(row.estimated_revenue) || 0;
      existing.count++;
      analyticsMap.set(vid, existing);
    }

    const linkedVideos: LinkedVideo[] = videoQueue
      .filter((v: any) => v.youtube_video_id && analyticsMap.has(v.youtube_video_id))
      .map((v: any) => {
        const stats = analyticsMap.get(v.youtube_video_id)!;
        const avgCtrForVideo = stats.count > 0 ? stats.ctr / stats.count : 0;
        return {
          title: v.title,
          youtubeVideoId: v.youtube_video_id,
          views: stats.views,
          ctr: avgCtrForVideo,
          subsGained: stats.subs,
          estimatedRevenue: Math.round(stats.revenue * 100) / 100,
          vsAvgViews: avgViews > 0 ? Math.round((stats.views / avgViews) * 100) : 100,
          vsAvgCtr: avgCtr > 0 ? Math.round((avgCtrForVideo / avgCtr) * 100) : 100,
        };
      });

    const totalDealValue = deals
      .filter((d: any) => d.stage === "closed_won")
      .reduce((s: number, d: any) => s + (d.value || 0), 0);

    const totalAdRevenue = linkedVideos.reduce((s, v) => s + v.estimatedRevenue, 0);
    const totalRelationshipValue = totalDealValue + totalAdRevenue;

    // Partnership score based on video performance vs average
    const avgPerformance = linkedVideos.length > 0
      ? linkedVideos.reduce((s, v) => s + v.vsAvgViews, 0) / linkedVideos.length
      : 100;

    const partnershipScore = Math.min(100, Math.max(0, Math.round(avgPerformance)));

    return {
      linkedVideos,
      totalDealValue,
      totalAdRevenue: Math.round(totalAdRevenue * 100) / 100,
      totalRelationshipValue: Math.round(totalRelationshipValue),
      partnershipScore,
      performanceVsAvg: Math.round(avgPerformance),
    };
  }, [contactId, deals, videoQueue, videoAnalytics, channelAvg]);

  return { data: impact };
}
