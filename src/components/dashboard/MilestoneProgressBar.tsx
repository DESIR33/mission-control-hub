import {
  Target, TrendingUp, TrendingDown, Minus, Zap, Flame, Calendar,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useMilestoneCountdown } from "@/hooks/use-milestone-countdown";

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

const momentumConfig = {
  accelerating: {
    label: "Accelerating",
    icon: TrendingUp,
    className: "bg-green-500/15 text-green-400 border-green-500/30",
  },
  steady: {
    label: "Steady",
    icon: Minus,
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  decelerating: {
    label: "Decelerating",
    icon: TrendingDown,
    className: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  },
};

export function MilestoneProgressBar() {
  const { data: countdown, isLoading } = useMilestoneCountdown();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Milestone Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!countdown) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Milestone Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No subscriber data available yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { currentSubs, nextMilestone, dailyRate, streakDays, recentMomentum } = countdown;
  const momentum = momentumConfig[recentMomentum];
  const MomentumIcon = momentum.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Milestone Progress
          </CardTitle>
          <Badge variant="outline" className={`text-xs ${momentum.className}`}>
            <MomentumIcon className="w-3 h-3 mr-0.5" />
            {momentum.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current subscriber count */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold font-mono text-foreground">
              {fmtCount(currentSubs)}
            </p>
            <p className="text-xs text-muted-foreground">
              subscribers
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold font-mono text-foreground">
              {nextMilestone.label}
            </p>
            <p className="text-xs text-muted-foreground">
              next milestone
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">
              {fmtCount(nextMilestone.previousMilestone)}
            </span>
            <span className="text-xs font-medium text-foreground">
              {nextMilestone.progressPercent.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground">
              {nextMilestone.label}
            </span>
          </div>
          <Progress value={nextMilestone.progressPercent} className="h-2.5" />
          <p className="text-xs text-muted-foreground mt-1">
            {fmtCount(nextMilestone.subsNeeded)} subscribers to go
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-lg border border-border bg-card p-2 sm:p-2.5">
            <div className="flex items-center gap-1 mb-0.5">
              <TrendingUp className="w-3 h-3 text-green-500 shrink-0" />
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider truncate">
                Daily Rate
              </p>
            </div>
            <p className="text-sm font-bold font-mono text-foreground">
              +{dailyRate}/d
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-2 sm:p-2.5">
            <div className="flex items-center gap-1 mb-0.5">
              <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                ETA
              </p>
            </div>
            <p className="text-sm font-bold font-mono text-foreground">
              {nextMilestone.daysAway != null ? `${nextMilestone.daysAway}d` : "--"}
            </p>
            {nextMilestone.estimatedDate && (
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {nextMilestone.estimatedDate}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-2 sm:p-2.5">
            <div className="flex items-center gap-1 mb-0.5">
              <Flame className="w-3 h-3 text-orange-500 shrink-0" />
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                Streak
              </p>
            </div>
            <p className="text-sm font-bold font-mono text-foreground">
              {streakDays}d
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              consecutive growth
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
