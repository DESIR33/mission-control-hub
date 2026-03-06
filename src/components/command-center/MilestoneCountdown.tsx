import {
  Trophy, TrendingUp, Flame, Calendar, ArrowUpRight,
  Zap, Target, CheckCircle2, Circle,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMilestoneCountdown } from "@/hooks/use-milestone-countdown";
import { useGoalPace } from "@/hooks/use-goal-pace";

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

const momentumConfig: Record<string, { label: string; color: string; icon: any }> = {
  accelerating: { label: "Accelerating", color: "text-green-400", icon: ArrowUpRight },
  steady: { label: "Steady", color: "text-blue-400", icon: TrendingUp },
  decelerating: { label: "Decelerating", color: "text-yellow-400", icon: TrendingUp },
};

export function MilestoneCountdown() {
  const { data: countdown, isLoading } = useMilestoneCountdown();
  const { data: pace } = useGoalPace();

  if (isLoading) {
    return <div className="rounded-lg border border-border bg-card p-6 animate-pulse h-96" />;
  }

  if (!countdown) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No subscriber data available for milestones.</p>
      </div>
    );
  }

  const momentum = momentumConfig[countdown.recentMomentum];
  const MomentumIcon = momentum.icon;
  const next = countdown.nextMilestone;

  return (
    <div className="space-y-4">
      {/* Next Milestone Hero */}
      <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-6 text-center">
        <Trophy className="w-10 h-10 mx-auto mb-3 text-purple-400" />
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Next Milestone</p>
        <p className="text-4xl font-bold font-mono text-foreground">{next.label}</p>
        <p className="text-sm text-muted-foreground mt-2">
          {next.reached
            ? "Reached!"
            : `${fmtCount(next.subsNeeded)} subscribers to go`}
        </p>
        {next.estimatedDate && (
          <p className="text-xs text-purple-400 mt-1">
            Estimated: {next.estimatedDate}
          </p>
        )}
        <div className="mt-4 max-w-md mx-auto">
          <Progress value={next.progressPercent} className="h-4" />
          <p className="text-xs text-muted-foreground mt-1">
            {next.progressPercent.toFixed(1)}% of the way from {fmtCount(next.previousMilestone)} to {next.label}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Daily Rate</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">+{countdown.dailyRate}</p>
          <p className="text-xs text-muted-foreground">subs/day</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Growth Streak</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{countdown.streakDays}</p>
          <p className="text-xs text-muted-foreground">days</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <MomentumIcon className={`w-3.5 h-3.5 ${momentum.color}`} />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Momentum</p>
          </div>
          <p className={`text-sm font-semibold ${momentum.color}`}>{momentum.label}</p>
        </div>

        {countdown.bestDay && (
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-yellow-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Best Day</p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">+{countdown.bestDay.gained}</p>
            <p className="text-xs text-muted-foreground">{countdown.bestDay.date}</p>
          </div>
        )}
      </div>

      {/* Pace Tracking */}
      {pace && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Growth Pace to 50K</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Required/Week</p>
              <p className="text-sm font-bold font-mono text-foreground">+{Math.round(pace.requiredWeeklyRate)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Actual/Week</p>
              <p className={`text-sm font-bold font-mono ${pace.paceZone === "green" ? "text-green-400" : pace.paceZone === "yellow" ? "text-yellow-400" : "text-red-400"}`}>
                +{Math.round(pace.actualWeeklyRate)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Weeks {pace.weeksAheadBehind >= 0 ? "Ahead" : "Behind"}</p>
              <p className={`text-sm font-bold font-mono ${pace.weeksAheadBehind >= 0 ? "text-green-400" : "text-red-400"}`}>
                {pace.weeksAheadBehind >= 0 ? "+" : ""}{pace.weeksAheadBehind.toFixed(1)}
              </p>
            </div>
          </div>
          {pace.microTargets.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={pace.microTargets.slice(-12)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="target" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} name="Target" strokeDasharray="5 5" />
                <Area type="monotone" dataKey="actual" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} name="Actual" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* All Milestones */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">All Milestones</h3>
        <div className="space-y-3">
          {countdown.allMilestones.map((m) => (
            <div key={m.value} className="flex items-center gap-3">
              {m.reached ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-semibold ${m.reached ? "text-green-400" : "text-foreground"}`}>
                    {m.label} subscribers
                  </p>
                  <div className="text-right">
                    {m.reached ? (
                      <Badge variant="default" className="text-xs">Reached</Badge>
                    ) : (
                      <>
                        {m.daysAway != null && (
                          <p className="text-xs text-muted-foreground">{m.daysAway} days</p>
                        )}
                        {m.estimatedDate && (
                          <p className="text-xs text-muted-foreground">{m.estimatedDate}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <Progress value={m.progressPercent} className="h-1.5 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
