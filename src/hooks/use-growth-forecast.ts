import { useMemo } from "react";
import { useYouTubeChannelStats } from "@/hooks/use-youtube-analytics";
import { useGrowthGoal } from "@/hooks/use-youtube-analytics";
import { differenceInDays, addDays, format } from "date-fns";

export interface ForecastPoint {
  date: string;
  actual?: number;
  forecast?: number;
  optimistic?: number;
  conservative?: number;
}

export interface GrowthForecast {
  currentSubs: number;
  targetSubs: number;
  targetDate: string | null;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  daysToTarget: number | null;
  forecastedTargetDate: string | null;
  onTrack: boolean;
  forecastPoints: ForecastPoint[];
  milestones: { label: string; value: number; date: string | null; reached: boolean }[];
  confidence: "high" | "medium" | "low";
}

/** Computes subscriber growth forecast from historical channel stats. */
export function useGrowthForecast() {
  const { data: snapshots = [], isLoading: snapshotsLoading } = useYouTubeChannelStats(90);
  const { data: goal, isLoading: goalLoading } = useGrowthGoal();

  const forecast = useMemo((): GrowthForecast | null => {
    if (!snapshots.length) return null;

    const sorted = [...snapshots]
      .sort((a, b) => new Date(a.fetched_at).getTime() - new Date(b.fetched_at).getTime());

    const currentSubs = sorted[sorted.length - 1].subscriber_count;
    const targetSubs = goal?.target_value ?? 50000;
    const targetDate = goal?.target_date ?? null;

    // Calculate daily growth rate using linear regression
    const points = sorted.map((s, i) => ({
      x: i,
      y: s.subscriber_count,
      date: s.fetched_at,
    }));

    const n = points.length;
    if (n < 2) return null;

    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Time span in days
    const firstDate = new Date(sorted[0].fetched_at);
    const lastDate = new Date(sorted[sorted.length - 1].fetched_at);
    const spanDays = Math.max(differenceInDays(lastDate, firstDate), 1);
    const dailyRate = (slope * n) / spanDays;
    const weeklyRate = dailyRate * 7;
    const monthlyRate = dailyRate * 30;

    // Days to target
    const subsRemaining = targetSubs - currentSubs;
    const daysToTarget = dailyRate > 0 ? Math.ceil(subsRemaining / dailyRate) : null;
    const forecastedTargetDate = daysToTarget
      ? format(addDays(new Date(), daysToTarget), "yyyy-MM-dd")
      : null;

    // On track check
    let onTrack = false;
    if (targetDate && daysToTarget) {
      const daysUntilTarget = differenceInDays(new Date(targetDate), new Date());
      onTrack = daysToTarget <= daysUntilTarget;
    } else if (daysToTarget && daysToTarget < 365) {
      onTrack = true;
    }

    // Build forecast points (historical + 90 days forecast)
    const forecastPoints: ForecastPoint[] = [];

    // Historical data
    sorted.forEach((s) => {
      forecastPoints.push({
        date: format(new Date(s.fetched_at), "MMM dd"),
        actual: s.subscriber_count,
      });
    });

    // Forecast 90 days out
    const optimisticMultiplier = 1.3;
    const conservativeMultiplier = 0.7;
    for (let d = 1; d <= 90; d += 3) {
      const projected = Math.round(currentSubs + dailyRate * d);
      forecastPoints.push({
        date: format(addDays(new Date(), d), "MMM dd"),
        forecast: projected,
        optimistic: Math.round(currentSubs + dailyRate * d * optimisticMultiplier),
        conservative: Math.round(currentSubs + dailyRate * d * conservativeMultiplier),
      });
    }

    // Standard milestones
    const milestoneValues = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
    const milestones = milestoneValues
      .filter((m) => m >= currentSubs * 0.5 && m <= targetSubs * 1.5)
      .map((value) => {
        const reached = currentSubs >= value;
        const subsNeeded = value - currentSubs;
        const days = dailyRate > 0 && !reached ? Math.ceil(subsNeeded / dailyRate) : null;
        return {
          label: value >= 1000000 ? `${value / 1000000}M` : value >= 1000 ? `${value / 1000}K` : String(value),
          value,
          date: days ? format(addDays(new Date(), days), "MMM yyyy") : null,
          reached,
        };
      });

    // Confidence based on data points and consistency
    const recentRates = sorted.slice(-7).map((s, i, arr) => {
      if (i === 0) return 0;
      const daysBetween = differenceInDays(new Date(s.fetched_at), new Date(arr[i - 1].fetched_at)) || 1;
      return (s.subscriber_count - arr[i - 1].subscriber_count) / daysBetween;
    }).filter(Boolean);

    const avgRate = recentRates.reduce((s, r) => s + r, 0) / (recentRates.length || 1);
    const variance = recentRates.reduce((s, r) => s + Math.pow(r - avgRate, 2), 0) / (recentRates.length || 1);
    const cv = avgRate > 0 ? Math.sqrt(variance) / avgRate : 999;

    const confidence: "high" | "medium" | "low" = cv < 0.5 ? "high" : cv < 1.5 ? "medium" : "low";

    return {
      currentSubs,
      targetSubs,
      targetDate,
      dailyRate: Math.round(dailyRate * 10) / 10,
      weeklyRate: Math.round(weeklyRate),
      monthlyRate: Math.round(monthlyRate),
      daysToTarget,
      forecastedTargetDate,
      onTrack,
      forecastPoints,
      milestones,
      confidence,
    };
  }, [snapshots, goal]);

  return { data: forecast, isLoading: snapshotsLoading || goalLoading };
}
