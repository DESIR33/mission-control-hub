import { useMemo } from "react";
import { useChannelStats, useGrowthGoal, useYouTubeChannelStats } from "@/hooks/use-youtube-analytics";
import { differenceInDays, addDays, format } from "date-fns";

export interface Milestone {
  label: string;
  value: number;
  reached: boolean;
  daysAway: number | null;
  estimatedDate: string | null;
  subsNeeded: number;
  progressPercent: number;
  previousMilestone: number;
}

export interface MilestoneCountdown {
  currentSubs: number;
  nextMilestone: Milestone;
  allMilestones: Milestone[];
  dailyRate: number;
  streakDays: number; // consecutive days of growth
  bestDay: { date: string; gained: number } | null;
  recentMomentum: "accelerating" | "steady" | "decelerating";
}

const MILESTONES = [100, 500, 1000, 2000, 5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 75000, 100000, 250000, 500000, 1000000];

function fmtMilestone(n: number): string {
  if (n >= 1_000_000) return `${n / 1_000_000}M`;
  if (n >= 1_000) return `${n / 1_000}K`;
  return String(n);
}

/** Provides milestone countdown data computed from channel stats. */
export function useMilestoneCountdown() {
  const { data: stats, isLoading: statsLoading } = useChannelStats();
  const { data: snapshots = [], isLoading: snapshotsLoading } = useYouTubeChannelStats(90);

  const countdown = useMemo((): MilestoneCountdown | null => {
    if (!stats) return null;

    const currentSubs = stats.subscriber_count;
    const sorted = [...snapshots].sort(
      (a, b) => new Date(a.fetched_at).getTime() - new Date(b.fetched_at).getTime()
    );

    // Calculate daily rate
    let dailyRate = 0;
    if (sorted.length >= 2) {
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const days = Math.max(differenceInDays(new Date(last.fetched_at), new Date(first.fetched_at)), 1);
      dailyRate = (last.subscriber_count - first.subscriber_count) / days;
    }

    // Streak: consecutive days with positive growth
    let streakDays = 0;
    for (let i = sorted.length - 1; i > 0; i--) {
      if (sorted[i].subscriber_count > sorted[i - 1].subscriber_count) {
        streakDays++;
      } else {
        break;
      }
    }

    // Best day
    let bestDay: { date: string; gained: number } | null = null;
    for (let i = 1; i < sorted.length; i++) {
      const gained = sorted[i].subscriber_count - sorted[i - 1].subscriber_count;
      if (!bestDay || gained > bestDay.gained) {
        bestDay = { date: format(new Date(sorted[i].fetched_at), "MMM dd"), gained };
      }
    }

    // Momentum: compare recent 7d rate vs prior 7d
    let recentMomentum: "accelerating" | "steady" | "decelerating" = "steady";
    if (sorted.length >= 14) {
      const recent7 = sorted.slice(-7);
      const prior7 = sorted.slice(-14, -7);
      const recentGain = recent7[recent7.length - 1].subscriber_count - recent7[0].subscriber_count;
      const priorGain = prior7[prior7.length - 1].subscriber_count - prior7[0].subscriber_count;
      if (recentGain > priorGain * 1.2) recentMomentum = "accelerating";
      else if (recentGain < priorGain * 0.8) recentMomentum = "decelerating";
    }

    // Build milestones
    const allMilestones: Milestone[] = MILESTONES.map((value, i) => {
      const reached = currentSubs >= value;
      const subsNeeded = Math.max(0, value - currentSubs);
      const daysAway = !reached && dailyRate > 0 ? Math.ceil(subsNeeded / dailyRate) : null;
      const previousMilestone = i > 0 ? MILESTONES[i - 1] : 0;
      const rangeSize = value - previousMilestone;
      const progressInRange = Math.max(0, currentSubs - previousMilestone);
      const progressPercent = reached ? 100 : Math.min(100, (progressInRange / rangeSize) * 100);

      return {
        label: fmtMilestone(value),
        value,
        reached,
        daysAway,
        estimatedDate: daysAway ? format(addDays(new Date(), daysAway), "MMM dd, yyyy") : null,
        subsNeeded,
        progressPercent,
        previousMilestone,
      };
    });

    const nextMilestone = allMilestones.find((m) => !m.reached) ?? allMilestones[allMilestones.length - 1];

    return {
      currentSubs,
      nextMilestone,
      allMilestones,
      dailyRate: Math.round(dailyRate * 10) / 10,
      streakDays,
      bestDay,
      recentMomentum,
    };
  }, [stats, snapshots]);

  return { data: countdown, isLoading: statsLoading || snapshotsLoading };
}
