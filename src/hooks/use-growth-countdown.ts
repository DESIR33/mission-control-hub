import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { differenceInDays, addDays, format } from "date-fns";

export interface GrowthCountdownData {
  currentSubs: number;
  targetSubs: number;
  subsToGo: number;
  dailyGrowthRate: number;
  projectedDate: Date | null;
  daysRemaining: number | null;
  requiredDailyRate: number | null;
  paceStatus: "ahead" | "on-track" | "behind";
  sparklineData: Array<{ date: string; gained: number }>;
  progressPercent: number;
  targetDate: string | null;
}

const DEFAULT_TARGET = 50_000;

export function useGrowthCountdown() {
  const { workspaceId } = useWorkspace();

  // Fetch last 60 days of youtube_channel_analytics
  const { data: channelAnalytics = [], isLoading: analyticsLoading } = useQuery({
    queryKey: ["growth-countdown-analytics", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_channel_analytics" as any)
        .select("date, subscribers_gained, subscribers_lost, net_subscribers")
        .eq("workspace_id", workspaceId!)
        .order("date", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        ...d,
        subscribers: null,
      })) as unknown as Array<{
        date: string;
        subscribers: number | null;
        subscribers_gained: number | null;
        subscribers_lost: number | null;
      }>;
    },
    enabled: !!workspaceId,
  });

  // Fetch active growth goal for subscribers
  const { data: growthGoals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["growth-countdown-goals", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("growth_goals" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("metric", "subscribers")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        target_value: number;
        current_value: number;
        target_date: string | null;
        start_date: string | null;
      }>;
    },
    enabled: !!workspaceId,
  });

  const data = useMemo((): GrowthCountdownData | null => {
    const goal = growthGoals[0];
    const sorted = [...channelAnalytics].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Determine current subscribers
    const latestEntry = sorted[sorted.length - 1];
    const currentSubs = latestEntry?.subscribers ?? goal?.current_value ?? 0;
    if (currentSubs === 0 && !goal) return null;

    const targetSubs = goal?.target_value ?? DEFAULT_TARGET;
    const targetDate = goal?.target_date ?? null;
    const subsToGo = Math.max(0, targetSubs - currentSubs);

    // Calculate daily growth rate from last 30 days
    const last30 = sorted.slice(-30);
    let dailyGrowthRate = 0;

    if (last30.length >= 2) {
      // Prefer subscribers_gained if available
      const withGains = last30.filter((d) => d.subscribers_gained != null);
      if (withGains.length > 0) {
        const totalGained = withGains.reduce(
          (sum, d) => sum + (d.subscribers_gained ?? 0),
          0
        );
        dailyGrowthRate = totalGained / withGains.length;
      } else {
        const oldest = last30[0];
        const newest = last30[last30.length - 1];
        const daysBetween = Math.max(
          1,
          differenceInDays(new Date(newest.date), new Date(oldest.date))
        );
        dailyGrowthRate = (newest.subscribers - oldest.subscribers) / daysBetween;
      }
    }

    // Projected date to reach target
    let projectedDate: Date | null = null;
    let daysRemaining: number | null = null;

    if (dailyGrowthRate > 0 && subsToGo > 0) {
      const daysNeeded = Math.ceil(subsToGo / dailyGrowthRate);
      projectedDate = addDays(new Date(), daysNeeded);
      daysRemaining = daysNeeded;
    }

    // Required daily rate (if target date exists)
    let requiredDailyRate: number | null = null;
    if (targetDate) {
      const daysToTarget = differenceInDays(new Date(targetDate), new Date());
      if (daysToTarget > 0) {
        requiredDailyRate = subsToGo / daysToTarget;
      }
    }

    // Pace status
    let paceStatus: "ahead" | "on-track" | "behind" = "on-track";
    if (requiredDailyRate != null) {
      if (dailyGrowthRate >= requiredDailyRate * 1.1) {
        paceStatus = "ahead";
      } else if (dailyGrowthRate < requiredDailyRate * 0.9) {
        paceStatus = "behind";
      }
    } else if (projectedDate) {
      // No target date, just check if we're growing
      paceStatus = dailyGrowthRate > 0 ? "ahead" : "behind";
    }

    // Sparkline data: daily gains for last 30 days
    const sparklineData = last30.map((entry) => ({
      date: format(new Date(entry.date), "MMM d"),
      gained: entry.subscribers_gained ?? 0,
    }));

    const progressPercent =
      targetSubs > 0
        ? Math.max(0, Math.min(100, (currentSubs / targetSubs) * 100))
        : 0;

    return {
      currentSubs,
      targetSubs,
      subsToGo,
      dailyGrowthRate,
      projectedDate,
      daysRemaining,
      requiredDailyRate,
      paceStatus,
      sparklineData,
      progressPercent,
      targetDate,
    };
  }, [channelAnalytics, growthGoals]);

  return { data, isLoading: analyticsLoading || goalsLoading };
}
