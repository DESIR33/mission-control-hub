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
        .select("date, subscribers")
        .eq("workspace_id", workspaceId!)
        .order("date", { ascending: false })
        .limit(60);
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

    const latestChannel = channelData[0];
    const currentSubs = latestChannel?.subscribers || goal.current_value || 0;

    const now = new Date();
    const target = new Date(targetDate);
    const weeksRemaining = Math.max(1, differenceInWeeks(target, now));
    const requiredWeeklyRate = (targetSubs - currentSubs) / weeksRemaining;

    let actualWeeklyRate = requiredWeeklyRate;
    if (channelData.length >= 14) {
      const fourWeeksAgo = channelData[Math.min(28, channelData.length - 1)];
      const recent = channelData[0];
      if (fourWeeksAgo && recent) {
        const subsDiff = (recent.subscribers || 0) - (fourWeeksAgo.subscribers || 0);
        const daysDiff = Math.max(1, Math.floor((new Date(recent.date).getTime() - new Date(fourWeeksAgo.date).getTime()) / (1000 * 60 * 60 * 24)));
        actualWeeklyRate = (subsDiff / daysDiff) * 7;
      }
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
      const channelEntry = channelData.find((c: any) => c.date <= weekStr);
      if (channelEntry && weekDate <= now) {
        actual = channelEntry.subscribers;
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
  }, [goals, channelData]);

  return { data: pace, isLoading: goalsLoading || channelLoading, goalRecord };
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
