import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useMemo } from "react";
import {
  useGrowthGoal,
  useChannelStats,
  useYouTubeChannelStats,
} from "@/hooks/use-youtube-analytics";
import { safeFormat } from "@/lib/date-utils";
import { differenceInDays, format, addMonths } from "date-fns";

export interface GrowthAlert {
  id: string;
  alertType: "milestone_reached" | "momentum_change" | "pace_update" | "streak";
  message: string;
  milestoneValue?: number;
  severity: "celebration" | "warning" | "info";
  createdAt: string;
}

const SUBSCRIBER_GOAL = 50_000;

export function useGrowthAlerts() {
  const { workspaceId } = useWorkspace();
  const { data: goal } = useGrowthGoal();
  const { data: channelStats } = useChannelStats();
  const { data: snapshots = [] } = useYouTubeChannelStats(30);

  const alerts = useMemo((): GrowthAlert[] => {
    const items: GrowthAlert[] = [];
    const currentSubs = goal?.current_value ?? channelStats?.subscriber_count ?? 21000;
    const targetValue = goal?.target_value ?? SUBSCRIBER_GOAL;
    const targetDate = goal?.target_date ?? format(addMonths(new Date(), 10), "yyyy-MM-dd");

    const milestones = [25000, 30000, 35000, 40000, 45000, 50000];

    // Milestone alerts
    for (const m of milestones) {
      if (currentSubs >= m) {
        items.push({
          id: `milestone-${m}`,
          alertType: "milestone_reached",
          message: `Milestone reached: ${(m / 1000).toFixed(0)}K subscribers!`,
          milestoneValue: m,
          severity: "celebration",
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Pace tracking
    const daysLeft = Math.max(differenceInDays(new Date(targetDate), new Date()), 1);
    const remaining = targetValue - currentSubs;
    const requiredDailyRate = remaining / daysLeft;

    // Calculate actual daily rate from snapshots
    const sorted = [...snapshots].sort((a, b) =>
      new Date(a.fetched_at).getTime() - new Date(b.fetched_at).getTime()
    );
    if (sorted.length >= 2) {
      const oldest = sorted[0];
      const newest = sorted[sorted.length - 1];
      const daysBetween = Math.max(
        differenceInDays(new Date(newest.fetched_at), new Date(oldest.fetched_at)),
        1
      );
      const actualDailyRate = (newest.subscriber_count - oldest.subscriber_count) / daysBetween;

      if (actualDailyRate >= requiredDailyRate) {
        items.push({
          id: "pace-ahead",
          alertType: "pace_update",
          message: `You're ahead of pace! Growing ${actualDailyRate.toFixed(0)} subs/day vs ${requiredDailyRate.toFixed(0)} needed for ${(targetValue / 1000).toFixed(0)}K.`,
          severity: "celebration",
          createdAt: new Date().toISOString(),
        });
      } else {
        items.push({
          id: "pace-behind",
          alertType: "pace_update",
          message: `Growing ${actualDailyRate.toFixed(0)} subs/day — need ${requiredDailyRate.toFixed(0)}/day to hit ${(targetValue / 1000).toFixed(0)}K by ${safeFormat(targetDate, "MMM yyyy")}.`,
          severity: "warning",
          createdAt: new Date().toISOString(),
        });
      }

      // Momentum detection
      if (sorted.length >= 14) {
        const mid = Math.floor(sorted.length / 2);
        const firstHalf = sorted.slice(0, mid);
        const secondHalf = sorted.slice(mid);
        const firstGrowth = (firstHalf[firstHalf.length - 1].subscriber_count - firstHalf[0].subscriber_count) / firstHalf.length;
        const secondGrowth = (secondHalf[secondHalf.length - 1].subscriber_count - secondHalf[0].subscriber_count) / secondHalf.length;

        if (secondGrowth > firstGrowth * 1.3) {
          items.push({
            id: "momentum-accelerating",
            alertType: "momentum_change",
            message: "Growth is accelerating! Your recent subscriber rate is 30%+ faster than earlier this month.",
            severity: "celebration",
            createdAt: new Date().toISOString(),
          });
        } else if (secondGrowth < firstGrowth * 0.7) {
          items.push({
            id: "momentum-decelerating",
            alertType: "momentum_change",
            message: "Growth has slowed. Consider publishing more frequently or experimenting with new content formats.",
            severity: "warning",
            createdAt: new Date().toISOString(),
          });
        }
      }

      // Growth streak
      let streakDays = 0;
      for (let i = sorted.length - 1; i > 0; i--) {
        if (sorted[i].subscriber_count > sorted[i - 1].subscriber_count) {
          streakDays++;
        } else break;
      }
      if (streakDays >= 7) {
        items.push({
          id: `streak-${streakDays}`,
          alertType: "streak",
          message: `${streakDays}-day growth streak! You've gained subscribers every day for ${streakDays} days straight.`,
          severity: "celebration",
          createdAt: new Date().toISOString(),
        });
      }
    }

    return items;
  }, [goal, channelStats, snapshots]);

  return { data: alerts, alerts };
}
