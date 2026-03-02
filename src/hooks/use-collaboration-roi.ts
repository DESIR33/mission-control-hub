import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useContentRevenue } from "@/hooks/use-content-revenue";

export interface CollaborationROIItem {
  id: string;
  partnerName: string;
  videoTitle: string | null;
  status: string;
  expectedSubGain: number;
  actualSubGain: number;
  expectedVsActual: number;
  viewsGenerated: number;
  revenueGenerated: number;
  publishedDate: string | null;
}

export interface CollaborationROISummary {
  items: CollaborationROIItem[];
  totalSubsFromCollabs: number;
  bestCollabROI: CollaborationROIItem | null;
  avgSubGainPerCollab: number;
  totalRevenueFromCollabs: number;
}

export function useCollaborationROI() {
  const { workspaceId } = useWorkspace();
  const { data: revenueSummary } = useContentRevenue();

  const { data: collaborations = [], isLoading: collabLoading } = useQuery({
    queryKey: ["collaboration-roi", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collaborations" as any)
        .select("*")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: videoQueue = [] } = useQuery({
    queryKey: ["collaboration-roi-queue", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_queue")
        .select("id, title, youtube_video_id")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: videoAnalytics = [] } = useQuery({
    queryKey: ["collaboration-roi-analytics", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_video_analytics" as any)
        .select("youtube_video_id, views, subscribers_gained")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const summary = useMemo((): CollaborationROISummary | null => {
    if (!collaborations.length) return null;

    const queueMap = new Map<string, { title: string; youtubeVideoId: string | null }>();
    for (const vq of videoQueue) {
      queueMap.set(String(vq.id), { title: vq.title, youtubeVideoId: vq.youtube_video_id });
    }

    // Aggregate analytics by youtube_video_id
    const analyticsMap = new Map<string, { views: number; subsGained: number }>();
    for (const row of videoAnalytics) {
      const existing = analyticsMap.get(row.youtube_video_id) ?? { views: 0, subsGained: 0 };
      existing.views += row.views;
      existing.subsGained += row.subscribers_gained;
      analyticsMap.set(row.youtube_video_id, existing);
    }

    const revenueByQueueId = new Map<number, number>();
    if (revenueSummary?.links) {
      for (const link of revenueSummary.links) {
        revenueByQueueId.set(link.videoQueueId, link.totalRevenue);
      }
    }

    const items: CollaborationROIItem[] = collaborations.map((collab: any) => {
      const vqId = collab.video_queue_id;
      const vqInfo = vqId ? queueMap.get(String(vqId)) : null;
      const ytId = vqInfo?.youtubeVideoId;
      const analytics = ytId ? analyticsMap.get(ytId) : null;
      const revenue = vqId ? (revenueByQueueId.get(Number(vqId)) ?? 0) : 0;

      const expectedSubGain = collab.expected_sub_gain ?? 0;
      const actualSubGain = collab.actual_sub_gain ?? analytics?.subsGained ?? 0;
      const expectedVsActual = expectedSubGain > 0 ? (actualSubGain / expectedSubGain) * 100 : 0;

      return {
        id: collab.id,
        partnerName: collab.partner_name ?? collab.channel_name ?? "Unknown",
        videoTitle: vqInfo?.title ?? null,
        status: collab.status,
        expectedSubGain,
        actualSubGain,
        expectedVsActual,
        viewsGenerated: analytics?.views ?? 0,
        revenueGenerated: revenue,
        publishedDate: collab.published_date ?? null,
      };
    });

    const published = items.filter((i) => i.status === "published");
    const totalSubsFromCollabs = published.reduce((s, i) => s + i.actualSubGain, 0);
    const totalRevenueFromCollabs = published.reduce((s, i) => s + i.revenueGenerated, 0);
    const avgSubGainPerCollab = published.length > 0 ? totalSubsFromCollabs / published.length : 0;
    const bestCollabROI = [...published].sort((a, b) => b.actualSubGain - a.actualSubGain)[0] ?? null;

    return {
      items,
      totalSubsFromCollabs,
      bestCollabROI,
      avgSubGainPerCollab,
      totalRevenueFromCollabs,
    };
  }, [collaborations, videoQueue, videoAnalytics, revenueSummary]);

  return { data: summary, isLoading: collabLoading };
}
