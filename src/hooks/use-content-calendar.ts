import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useMemo } from "react";
import { useVideoAnalytics } from "@/hooks/use-youtube-analytics-api";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, isSameDay, parseISO } from "date-fns";

export interface ContentCalendarEntry {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  status: "idea" | "scripting" | "filming" | "editing" | "scheduled" | "published";
  video_queue_id: number | null;
  predicted_views: number | null;
  predicted_subs_gain: number | null;
  target_audience: string | null;
  content_type: "long_form" | "short" | "livestream" | "premiere" | "community_post" | null;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarDay {
  date: string;
  dayName: string;
  entries: ContentCalendarEntry[];
  isToday: boolean;
  predictedImpact: number;
}

export interface CalendarWeek {
  weekLabel: string;
  startDate: string;
  days: CalendarDay[];
  totalPredictedViews: number;
  totalPredictedSubs: number;
}

export interface ContentCalendar {
  entries: ContentCalendarEntry[];
  weeks: CalendarWeek[];
  statusCounts: Record<string, number>;
  upcomingCount: number;
  avgPredictedViews: number;
}

export function useContentCalendarEntries() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["content-calendar", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_calendar_entries" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ContentCalendarEntry[];
    },
    enabled: !!workspaceId,
  });
}

export function useContentCalendar(weeksAhead = 4) {
  const { data: entries = [], isLoading: entriesLoading } = useContentCalendarEntries();
  const { data: videoData = [] } = useVideoAnalytics(90);

  const calendar = useMemo((): ContentCalendar | null => {
    // Calculate avg views for predictions
    const avgViews = videoData.length > 0
      ? videoData.reduce((s, v) => s + v.views, 0) / videoData.length
      : 0;

    const today = new Date();
    const weeks: CalendarWeek[] = [];

    for (let w = 0; w < weeksAhead; w++) {
      const weekStart = startOfWeek(addWeeks(today, w), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(addWeeks(today, w), { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

      const calendarDays: CalendarDay[] = days.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayEntries = entries.filter((e) => e.scheduled_date === dayStr);
        const predictedImpact = dayEntries.reduce(
          (s, e) => s + (e.predicted_views ?? avgViews * 0.8),
          0
        );

        return {
          date: dayStr,
          dayName: format(day, "EEE"),
          entries: dayEntries,
          isToday: isSameDay(day, today),
          predictedImpact,
        };
      });

      weeks.push({
        weekLabel: `${format(weekStart, "MMM dd")} - ${format(weekEnd, "MMM dd")}`,
        startDate: format(weekStart, "yyyy-MM-dd"),
        days: calendarDays,
        totalPredictedViews: calendarDays.reduce((s, d) => s + d.entries.reduce((es, e) => es + (e.predicted_views ?? 0), 0), 0),
        totalPredictedSubs: calendarDays.reduce((s, d) => s + d.entries.reduce((es, e) => es + (e.predicted_subs_gain ?? 0), 0), 0),
      });
    }

    const statusCounts: Record<string, number> = {};
    entries.forEach((e) => {
      statusCounts[e.status] = (statusCounts[e.status] ?? 0) + 1;
    });

    const upcoming = entries.filter((e) => e.scheduled_date >= format(today, "yyyy-MM-dd") && e.status !== "published");
    const avgPredictedViews = upcoming.length > 0
      ? upcoming.reduce((s, e) => s + (e.predicted_views ?? 0), 0) / upcoming.length
      : 0;

    return {
      entries,
      weeks,
      statusCounts,
      upcomingCount: upcoming.length,
      avgPredictedViews,
    };
  }, [entries, videoData, weeksAhead]);

  return { data: calendar, isLoading: entriesLoading };
}

export function useCreateCalendarEntry() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Partial<ContentCalendarEntry>) => {
      const { data, error } = await supabase
        .from("content_calendar_entries" as any)
        .insert({ ...entry, workspace_id: workspaceId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-calendar"] }),
  });
}

export function useUpdateCalendarEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContentCalendarEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from("content_calendar_entries" as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-calendar"] }),
  });
}

export function useDeleteCalendarEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_calendar_entries" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-calendar"] }),
  });
}
