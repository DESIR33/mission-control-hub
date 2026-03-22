import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { differenceInWeeks, format, startOfWeek, addWeeks } from "date-fns";
import { toast } from "sonner";

export interface GoalPaceData {
  currentSubs: number;
  targetSubs: number;
  targetDate: string;
  weeksRemaining: number;
  requiredWeeklyRate: number;
  actualWeeklyRate: number;
  weeksAheadBehind: number;
  paceZone: "green" | "yellow" | "red";
  pacePercent: number;
  microTargets: Array<{ week: string; target: number; actual: number | null }>;
  progressPercent: number;
}

export function useGoalPace() {
  const { workspaceId } = useWorkspace();

  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["goal-pace-goals", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("growth_goals" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("metric", "subscribers")
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: channelData = [], isLoading: channelLoading } = useQuery({
    queryKey: ["goal-pace-channel", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_channel_analytics" as any)
        .select("date, net_subscribers")
        .eq("workspace_id", workspaceId!)
        .order("date", { ascending: false })
        .limit(120);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: channelStats = [], isLoading: channelStatsLoading } = useQuery({
    queryKey: ["goal-pace-channel-stats", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_channel_stats" as any)
        .select("subscriber_count, fetched_at")
        .eq("workspace_id", workspaceId!)
        .order("fetched_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const goalRecord = goals[0] || null;

  const pace = useMemo((): GoalPaceData | null => {
    const goal = goals[0];
    if (!goal) return null;

    const targetSubs = goal.target_value || 50000;
    const targetDate = goal.target_date || "2027-01-01";
    const startDate = goal.start_date || "2026-03-01";

    const latestStats = channelStats[0];
    const currentSubs = Number(latestStats?.subscriber_count ?? goal.current_value ?? 0);

    const now = new Date();
    const target = new Date(targetDate);
    const weeksRemaining = Math.max(1, differenceInWeeks(target, now));
    const requiredWeeklyRate = (targetSubs - currentSubs) / weeksRemaining;

    let actualWeeklyRate = requiredWeeklyRate;
    if (channelData.length > 0) {
      const recentWindow = channelData.slice(0, 28);
      const netSubs = recentWindow.reduce((sum: number, row: any) => sum + Number(row.net_subscribers ?? 0), 0);
      const daysCovered = Math.max(1, recentWindow.length);
      actualWeeklyRate = (netSubs / daysCovered) * 7;
    }

    const pacePercent = requiredWeeklyRate > 0 ? (actualWeeklyRate / requiredWeeklyRate) * 100 : 100;

    const subsRemaining = targetSubs - currentSubs;
    const weeksNeeded = actualWeeklyRate > 0 ? subsRemaining / actualWeeklyRate : Infinity;
    const weeksAheadBehind = Math.round(weeksRemaining - weeksNeeded);

    let paceZone: "green" | "yellow" | "red" = "yellow";
    if (pacePercent >= 110) paceZone = "green";
    else if (pacePercent < 90) paceZone = "red";

    const start = new Date(startDate);
    const totalWeeks = differenceInWeeks(target, start);
    const subsToGain = targetSubs - (goal.current_value || currentSubs);
    const weeklyIncrement = totalWeeks > 0 ? subsToGain / totalWeeks : 0;
    const startingSubs = goal.current_value || currentSubs;

    const microTargets: Array<{ week: string; target: number; actual: number | null }> = [];
    for (let i = 0; i <= Math.min(totalWeeks, 52); i++) {
      const weekDate = addWeeks(start, i);
      const weekKey = format(startOfWeek(weekDate, { weekStartsOn: 1 }), "yyyy-'W'II");
      const targetForWeek = Math.round(startingSubs + weeklyIncrement * i);

      let actual: number | null = null;
      const weekStr = format(weekDate, "yyyy-MM-dd");
      if (weekDate <= now) {
        const cumulativeNetSubs = channelData.reduce((sum: number, entry: any) => {
          if (entry.date < startDate || entry.date > weekStr) return sum;
          return sum + Number(entry.net_subscribers ?? 0);
        }, 0);
        actual = Math.max(0, Math.round(startingSubs + cumulativeNetSubs));
      }

      microTargets.push({ week: weekKey, target: targetForWeek, actual });
    }

    const progressPercent = subsToGain > 0 ? ((currentSubs - startingSubs) / subsToGain) * 100 : 0;

    return {
      currentSubs,
      targetSubs,
      targetDate,
      weeksRemaining,
      requiredWeeklyRate: Math.round(requiredWeeklyRate),
      actualWeeklyRate: Math.round(actualWeeklyRate),
      weeksAheadBehind,
      paceZone,
      pacePercent: Math.round(pacePercent),
      microTargets,
      progressPercent: Math.max(0, Math.min(100, progressPercent)),
    };
  }, [goals, channelData, channelStats]);

  return { data: pace, isLoading: goalsLoading || channelLoading || channelStatsLoading, goalRecord };
}

export function useUpdateGoal() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id?: string;
      title: string;
      target_value: number;
      target_date: string;
      current_value: number;
    }) => {
      if (params.id) {
        const { error } = await supabase
          .from("growth_goals" as any)
          .update({
            title: params.title,
            target_value: params.target_value,
            target_date: params.target_date,
            current_value: params.current_value,
          })
          .eq("id", params.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("growth_goals" as any)
          .insert({
            workspace_id: workspaceId!,
            title: params.title,
            metric: "subscribers",
            target_value: params.target_value,
            target_date: params.target_date,
            current_value: params.current_value,
            start_date: new Date().toISOString().split("T")[0],
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal-pace-goals"] });
      toast.success("Goal updated");
    },
    onError: (err: any) => {
      toast.error("Failed to update goal: " + err.message);
    },
  });
}
