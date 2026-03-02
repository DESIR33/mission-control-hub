import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { startOfWeek, format, differenceInWeeks } from "date-fns";

export interface WeeklyCohort {
  week: string; // ISO week like "2026-W10"
  weekStart: string;
  subsGained: number;
  subsLost: number;
  netSubs: number;
  topVideo: string | null;
  topVideoSubs: number;
  contentTypes: string[];
}

export interface CohortAnalysisData {
  cohorts: WeeklyCohort[];
  weeklyAvgGain: number;
  bestCohortWeek: WeeklyCohort | null;
  weeksTo50K: number;
  currentSubs: number;
  requiredWeeklyRate: number;
  actualWeeklyRate: number;
  stickyContentTypes: string[];
  touristContentTypes: string[];
}

export function useCohortAnalysis() {
  const { workspaceId } = useWorkspace();

  const { data: channelAnalytics = [], isLoading: channelLoading } = useQuery({
    queryKey: ["cohort-channel-analytics", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_channel_analytics" as any)
        .select("date, subscribers, net_subscribers")
        .eq("workspace_id", workspaceId!)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: videoAnalytics = [] } = useQuery({
    queryKey: ["cohort-video-analytics", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_video_analytics" as any)
        .select("youtube_video_id, title, date, subscribers_gained, views")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: videoQueue = [] } = useQuery({
    queryKey: ["cohort-video-queue", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_queue")
        .select("youtube_video_id, content_type")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const analysis = useMemo((): CohortAnalysisData | null => {
    if (!channelAnalytics.length) return null;

    // Build content type map
    const contentTypeMap = new Map<string, string>();
    for (const vq of videoQueue) {
      if (vq.youtube_video_id) {
        contentTypeMap.set(vq.youtube_video_id, vq.content_type || "uncategorized");
      }
    }

    // Group channel analytics by ISO week
    const weekMap = new Map<string, { subsGained: number; subsLost: number; weekStart: string }>();

    for (const row of channelAnalytics) {
      const date = new Date(row.date);
      const ws = startOfWeek(date, { weekStartsOn: 1 });
      const weekKey = format(ws, "yyyy-'W'II");

      const existing = weekMap.get(weekKey) ?? { subsGained: 0, subsLost: 0, weekStart: format(ws, "yyyy-MM-dd") };
      const net = row.net_subscribers || 0;
      if (net >= 0) existing.subsGained += net;
      else existing.subsLost += Math.abs(net);
      weekMap.set(weekKey, existing);
    }

    // Group video analytics by week for top video per cohort
    const videoByWeek = new Map<string, Map<string, { title: string; subs: number; contentType: string }>>();
    for (const row of videoAnalytics) {
      if (!row.date) continue;
      const date = new Date(row.date);
      const ws = startOfWeek(date, { weekStartsOn: 1 });
      const weekKey = format(ws, "yyyy-'W'II");

      if (!videoByWeek.has(weekKey)) videoByWeek.set(weekKey, new Map());
      const weekVideos = videoByWeek.get(weekKey)!;

      const vid = row.youtube_video_id;
      const existing = weekVideos.get(vid) ?? {
        title: row.title || vid,
        subs: 0,
        contentType: contentTypeMap.get(vid) || "uncategorized",
      };
      existing.subs += row.subscribers_gained || 0;
      weekVideos.set(vid, existing);
    }

    // Build cohorts
    const cohorts: WeeklyCohort[] = Array.from(weekMap.entries())
      .map(([week, data]) => {
        const weekVideos = videoByWeek.get(week);
        let topVideo: string | null = null;
        let topVideoSubs = 0;
        const contentTypes = new Set<string>();

        if (weekVideos) {
          for (const [, vData] of weekVideos) {
            contentTypes.add(vData.contentType);
            if (vData.subs > topVideoSubs) {
              topVideo = vData.title;
              topVideoSubs = vData.subs;
            }
          }
        }

        return {
          week,
          weekStart: data.weekStart,
          subsGained: data.subsGained,
          subsLost: data.subsLost,
          netSubs: data.subsGained - data.subsLost,
          topVideo,
          topVideoSubs,
          contentTypes: Array.from(contentTypes),
        };
      })
      .sort((a, b) => a.week.localeCompare(b.week));

    const weeklyAvgGain = cohorts.length > 0
      ? cohorts.reduce((s, c) => s + c.netSubs, 0) / cohorts.length
      : 0;

    const bestCohortWeek = [...cohorts].sort((a, b) => b.netSubs - a.netSubs)[0] ?? null;

    // Current subscriber count from latest channel analytics
    const latestEntry = channelAnalytics[channelAnalytics.length - 1];
    const currentSubs = latestEntry?.subscribers || 21000;

    const TARGET = 50000;
    const weeksRemaining = 43; // ~10 months
    const requiredWeeklyRate = (TARGET - currentSubs) / weeksRemaining;
    const recentWeeks = cohorts.slice(-4);
    const actualWeeklyRate = recentWeeks.length > 0
      ? recentWeeks.reduce((s, c) => s + c.netSubs, 0) / recentWeeks.length
      : weeklyAvgGain;

    const weeksTo50K = actualWeeklyRate > 0
      ? Math.ceil((TARGET - currentSubs) / actualWeeklyRate)
      : Infinity;

    // Identify sticky vs tourist content types
    const typePerformance = new Map<string, { totalSubs: number; count: number }>();
    for (const cohort of cohorts) {
      for (const ct of cohort.contentTypes) {
        const existing = typePerformance.get(ct) ?? { totalSubs: 0, count: 0 };
        existing.totalSubs += cohort.netSubs;
        existing.count++;
        typePerformance.set(ct, existing);
      }
    }

    const sortedTypes = Array.from(typePerformance.entries())
      .map(([type, data]) => ({ type, avgSubs: data.count > 0 ? data.totalSubs / data.count : 0 }))
      .sort((a, b) => b.avgSubs - a.avgSubs);

    const midpoint = Math.ceil(sortedTypes.length / 2);
    const stickyContentTypes = sortedTypes.slice(0, midpoint).map((t) => t.type);
    const touristContentTypes = sortedTypes.slice(midpoint).map((t) => t.type);

    return {
      cohorts,
      weeklyAvgGain,
      bestCohortWeek,
      weeksTo50K,
      currentSubs,
      requiredWeeklyRate,
      actualWeeklyRate,
      stickyContentTypes,
      touristContentTypes,
    };
  }, [channelAnalytics, videoAnalytics, videoQueue]);

  return { data: analysis, isLoading: channelLoading };
}
