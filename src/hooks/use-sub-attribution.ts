import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface VideoSubAttribution {
  youtubeVideoId: string;
  title: string;
  contentType: string;
  subsGained: number;
  subsLost: number;
  netSubs: number;
  views: number;
  efficiencyScore: number; // (subs gained / views) * 1000
}

export interface CategoryAttribution {
  category: string;
  totalSubs: number;
  videoCount: number;
  avgEfficiency: number;
}

export interface SubAttributionData {
  videos: VideoSubAttribution[];
  categories: CategoryAttribution[];
  totalSubsFromContent: number;
  bestVideo: VideoSubAttribution | null;
  bestCategory: string;
  avgEfficiency: number;
  recommendations: string[];
}

export function useSubAttribution() {
  const { workspaceId } = useWorkspace();

  const { data: videoAnalytics = [], isLoading: analyticsLoading } = useQuery({
    queryKey: ["sub-attribution-analytics", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_video_analytics" as any)
        .select("youtube_video_id, title, views, subscribers_gained, subscribers_lost")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: videoQueue = [], isLoading: queueLoading } = useQuery({
    queryKey: ["sub-attribution-queue", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_queue")
        .select("id, title, youtube_video_id, content_type, tags")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const attribution = useMemo((): SubAttributionData | null => {
    if (!videoAnalytics.length) return null;

    // Aggregate analytics by video
    const videoMap = new Map<string, {
      title: string;
      subsGained: number;
      subsLost: number;
      views: number;
    }>();

    for (const row of videoAnalytics) {
      const vid = row.youtube_video_id;
      const existing = videoMap.get(vid) ?? { title: row.title || vid, subsGained: 0, subsLost: 0, views: 0 };
      existing.subsGained += row.subscribers_gained || 0;
      existing.subsLost += row.subscribers_lost || 0;
      existing.views += row.views || 0;
      if (row.title) existing.title = row.title;
      videoMap.set(vid, existing);
    }

    // Map video queue content types
    const queueMap = new Map<string, { contentType: string; tags: string[] }>();
    for (const vq of videoQueue) {
      if (vq.youtube_video_id) {
        queueMap.set(vq.youtube_video_id, {
          contentType: vq.content_type || "uncategorized",
          tags: vq.tags || [],
        });
      }
    }

    // Build video attribution list
    const videos: VideoSubAttribution[] = Array.from(videoMap.entries()).map(([vid, data]) => {
      const queueInfo = queueMap.get(vid);
      const netSubs = data.subsGained - data.subsLost;
      return {
        youtubeVideoId: vid,
        title: data.title,
        contentType: queueInfo?.contentType || "uncategorized",
        subsGained: data.subsGained,
        subsLost: data.subsLost,
        netSubs,
        views: data.views,
        efficiencyScore: data.views > 0 ? (data.subsGained / data.views) * 1000 : 0,
      };
    }).sort((a, b) => b.netSubs - a.netSubs);

    // Group by content type
    const categoryMap = new Map<string, { totalSubs: number; videoCount: number; totalEfficiency: number }>();
    for (const video of videos) {
      const cat = video.contentType;
      const existing = categoryMap.get(cat) ?? { totalSubs: 0, videoCount: 0, totalEfficiency: 0 };
      existing.totalSubs += video.netSubs;
      existing.videoCount++;
      existing.totalEfficiency += video.efficiencyScore;
      categoryMap.set(cat, existing);
    }

    const categories: CategoryAttribution[] = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        totalSubs: data.totalSubs,
        videoCount: data.videoCount,
        avgEfficiency: data.videoCount > 0 ? data.totalEfficiency / data.videoCount : 0,
      }))
      .sort((a, b) => b.totalSubs - a.totalSubs);

    const totalSubsFromContent = videos.reduce((s, v) => s + v.netSubs, 0);
    const bestVideo = videos[0] ?? null;
    const bestCategory = categories[0]?.category ?? "none";
    const avgEfficiency = videos.length > 0
      ? videos.reduce((s, v) => s + v.efficiencyScore, 0) / videos.length
      : 0;

    // Generate recommendations
    const recommendations: string[] = [];
    if (categories.length >= 2) {
      const top = categories[0];
      const second = categories[1];
      if (top.avgEfficiency > second.avgEfficiency * 1.5) {
        recommendations.push(
          `Your "${top.category}" videos convert ${(top.avgEfficiency / second.avgEfficiency).toFixed(1)}x more subscribers than "${second.category}" — publish more "${top.category}" content.`
        );
      }
    }
    if (bestVideo && bestVideo.efficiencyScore > avgEfficiency * 2) {
      recommendations.push(
        `"${bestVideo.title}" has ${bestVideo.efficiencyScore.toFixed(1)}x avg efficiency — study what made it effective and replicate the formula.`
      );
    }
    if (videos.length > 5) {
      const lowPerformers = videos.filter((v) => v.efficiencyScore < avgEfficiency * 0.3 && v.views > 100);
      if (lowPerformers.length > 0) {
        recommendations.push(
          `${lowPerformers.length} videos have very low subscriber conversion — consider updating their end screens and CTAs.`
        );
      }
    }

    return {
      videos,
      categories,
      totalSubsFromContent,
      bestVideo,
      bestCategory,
      avgEfficiency,
      recommendations,
    };
  }, [videoAnalytics, videoQueue]);

  return { data: attribution, isLoading: analyticsLoading || queueLoading };
}
