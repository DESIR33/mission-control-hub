import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { startOfMonth, endOfMonth, format, differenceInWeeks, subWeeks } from "date-fns";

export interface SuggestedSlot {
  dayOfWeek: number; // 0=Sun, 6=Sat
  hour: number;
  label: string;
  score: number;
}

export interface ContentMixItem {
  type: string;
  planned: number;
  ideal: number;
  efficiency: number;
}

export interface SmartCalendarData {
  suggestedSlots: SuggestedSlot[];
  contentMix: ContentMixItem[];
  streakWeeks: number;
  gapSuggestions: Array<{ topic: string; relevanceScore: number }>;
}

export function useSmartCalendar() {
  const { workspaceId } = useWorkspace();

  const { data: uploadTimeData = [] } = useQuery({
    queryKey: ["smart-cal-upload-times", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_video_stats" as any)
        .select("published_at, views")
        .eq("workspace_id", workspaceId!)
        .order("published_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: calendarEntries = [] } = useQuery({
    queryKey: ["smart-cal-entries", workspaceId],
    queryFn: async () => {
      const now = new Date();
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("content_calendar_entries" as any)
        .select("id, title, scheduled_date, content_type, status")
        .eq("workspace_id", workspaceId!)
        .gte("scheduled_date", monthStart)
        .lte("scheduled_date", monthEnd);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: videoQueue = [] } = useQuery({
    queryKey: ["smart-cal-queue", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_queue")
        .select("youtube_video_id, content_type, published_date")
        .eq("workspace_id", workspaceId!)
        .eq("status", "published")
        .order("published_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: contentGaps = [] } = useQuery({
    queryKey: ["smart-cal-gaps", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_gaps" as any)
        .select("topic, relevance_score")
        .eq("workspace_id", workspaceId!)
        .eq("status", "open")
        .order("relevance_score", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const smartData = useMemo((): SmartCalendarData | null => {
    // Analyze best publishing times from historical data
    const dayPerformance = new Map<string, { totalViews: number; count: number }>();
    for (const video of uploadTimeData) {
      if (!video.published_at) continue;
      const date = new Date(video.published_at);
      const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
      const hour = date.getHours();
      const key = `${dayName} ${hour}:00`;
      const existing = dayPerformance.get(key) ?? { totalViews: 0, count: 0 };
      existing.totalViews += video.views || 0;
      existing.count++;
      dayPerformance.set(key, existing);
    }

    const suggestedSlots: SuggestedSlot[] = Array.from(dayPerformance.entries())
      .map(([label, data]) => {
        const parts = label.split(" ");
        const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        return {
          dayOfWeek: dayMap[parts[0]] ?? 0,
          hour: parseInt(parts[1]) || 0,
          label,
          score: data.count > 0 ? data.totalViews / data.count : 0,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Content mix analysis
    const typeCounts = new Map<string, number>();
    for (const entry of calendarEntries) {
      const type = entry.content_type || "uncategorized";
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
    }

    // Ideal mix based on channel history
    const historicalTypeCounts = new Map<string, number>();
    for (const vq of videoQueue) {
      const type = vq.content_type || "uncategorized";
      historicalTypeCounts.set(type, (historicalTypeCounts.get(type) ?? 0) + 1);
    }

    const totalHistorical = Array.from(historicalTypeCounts.values()).reduce((a, b) => a + b, 0) || 1;
    const totalPlanned = calendarEntries.length || 1;

    const allTypes = new Set([...typeCounts.keys(), ...historicalTypeCounts.keys()]);
    const contentMix: ContentMixItem[] = Array.from(allTypes).map((type) => ({
      type,
      planned: typeCounts.get(type) ?? 0,
      ideal: Math.round(((historicalTypeCounts.get(type) ?? 0) / totalHistorical) * totalPlanned),
      efficiency: 1.0,
    }));

    // Publishing streak
    let streakWeeks = 0;
    const sortedPublished = videoQueue
      .filter((v: any) => v.published_date)
      .sort((a: any, b: any) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());

    if (sortedPublished.length > 0) {
      let checkDate = new Date();
      for (let i = 0; i < 52; i++) {
        const weekStart = subWeeks(checkDate, i);
        const weekEnd = subWeeks(checkDate, i - 1);
        const hasUpload = sortedPublished.some((v: any) => {
          const d = new Date(v.published_date);
          return d >= weekStart && d < weekEnd;
        });
        if (hasUpload) streakWeeks++;
        else break;
      }
    }

    const gapSuggestions = contentGaps.map((g: any) => ({
      topic: g.topic,
      relevanceScore: g.relevance_score || 0,
    }));

    return {
      suggestedSlots,
      contentMix,
      streakWeeks,
      gapSuggestions,
    };
  }, [uploadTimeData, calendarEntries, videoQueue, contentGaps]);

  return { data: smartData };
}
