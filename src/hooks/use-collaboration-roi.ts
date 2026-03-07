import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useContentRevenue } from "@/hooks/use-content-revenue";
import { useCollaborations, type Collaboration } from "@/hooks/use-collaborations";
import { useYouTubeChannelStats } from "@/hooks/use-youtube-analytics";

// ─── Legacy types (used by CollaborationTracker) ────────────────────────────

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

// ─── New ROI Dashboard types ────────────────────────────────────────────────

export interface CollaborationROI {
  collaboration: Collaboration;
  actualSubGain: number;
  expectedSubGain: number;
  roi: number; // actual/expected as percentage
  reCollabScore: number; // 0-100
  viewLift: number | null;
  costPerSub: number | null;
}

export interface CollabSummaryStats {
  totalCollabs: number;
  publishedCollabs: number;
  totalSubsGained: number;
  avgSubsPerCollab: number;
  bestCollab: CollaborationROI | null;
  avgROI: number;
}

// ─── Legacy hook (unchanged) ────────────────────────────────────────────────

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

// ─── New hooks for CollabROIDashboard ───────────────────────────────────────

export function useCollaborationROIScores() {
  const { data: collaborations = [], isLoading: collabsLoading } = useCollaborations();
  const { data: channelStats = [], isLoading: statsLoading } = useYouTubeChannelStats();

  const roiData = useMemo((): CollaborationROI[] => {
    if (!collaborations.length) return [];

    // Get the max subscriber count from channel stats for normalization
    const maxSubCount = channelStats.length > 0
      ? Math.max(...channelStats.map((s) => s.subscriber_count))
      : 100000;

    const items: CollaborationROI[] = collaborations
      .filter((c) => c.status === "published" || c.actual_sub_gain != null)
      .map((collab) => {
        const actualSubGain = collab.actual_sub_gain ?? 0;
        const expectedSubGain = collab.expected_sub_gain ?? 0;
        const roi = expectedSubGain > 0
          ? Math.round((actualSubGain / expectedSubGain) * 100)
          : actualSubGain > 0 ? 100 : 0;

        // Normalize partner subscriber count (0-100 scale)
        const partnerSubScore = collab.subscriber_count
          ? Math.min(100, Math.round((collab.subscriber_count / maxSubCount) * 100))
          : 0;

        // Re-collab score: actual_sub_gain (40%), roi (30%), partner sub count (30%)
        const subGainScore = expectedSubGain > 0
          ? Math.min(100, Math.round((actualSubGain / expectedSubGain) * 100))
          : actualSubGain > 0 ? 50 : 0;
        const roiScore = Math.min(100, roi);
        const reCollabScore = Math.round(
          subGainScore * 0.4 + roiScore * 0.3 + partnerSubScore * 0.3
        );

        return {
          collaboration: collab,
          actualSubGain,
          expectedSubGain,
          roi,
          reCollabScore: Math.min(100, Math.max(0, reCollabScore)),
          viewLift: null,
          costPerSub: null,
        };
      });

    // Sort by reCollabScore descending
    items.sort((a, b) => b.reCollabScore - a.reCollabScore);

    return items;
  }, [collaborations, channelStats]);

  return {
    data: roiData,
    isLoading: collabsLoading || statsLoading,
  };
}

export function useCollabSummaryStats() {
  const { data: roiData, isLoading } = useCollaborationROIScores();

  const stats = useMemo((): CollabSummaryStats => {
    const published = roiData.filter(
      (r) => r.collaboration.status === "published"
    );

    const totalSubsGained = published.reduce((sum, r) => sum + r.actualSubGain, 0);
    const avgSubsPerCollab = published.length > 0
      ? Math.round(totalSubsGained / published.length)
      : 0;

    const roiValues = published.filter((r) => r.expectedSubGain > 0);
    const avgROI = roiValues.length > 0
      ? Math.round(roiValues.reduce((sum, r) => sum + r.roi, 0) / roiValues.length)
      : 0;

    const bestCollab = published.length > 0 ? published[0] : null;

    return {
      totalCollabs: roiData.length,
      publishedCollabs: published.length,
      totalSubsGained,
      avgSubsPerCollab,
      bestCollab,
      avgROI,
    };
  }, [roiData]);

  return { data: stats, isLoading };
}
