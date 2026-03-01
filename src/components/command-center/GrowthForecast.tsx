import { useMemo } from "react";
import {
  TrendingUp, TrendingDown, Target, Calendar, Zap, Award,
  ArrowUpRight, ArrowDownRight, CheckCircle2, Circle,
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useGrowthForecast } from "@/hooks/use-growth-forecast";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

export function GrowthForecast() {
  const { data: forecast, isLoading } = useGrowthForecast();

  if (isLoading) {
    return <div className="rounded-lg border border-border bg-card p-6 animate-pulse h-96" />;
  }

  if (!forecast) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Need more subscriber data to generate forecast. Keep syncing!</p>
      </div>
    );
  }

  const progressToTarget = Math.min(100, (forecast.currentSubs / forecast.targetSubs) * 100);

  return (
    <div className="space-y-4">
      {/* Header KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Daily Growth</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">+{forecast.dailyRate}</p>
          <p className="text-[10px] text-muted-foreground">subs/day</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Monthly</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">+{fmtCount(forecast.monthlyRate)}</p>
          <p className="text-[10px] text-muted-foreground">subs/month</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-purple-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Days to {fmtCount(forecast.targetSubs)}</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">
            {forecast.daysToTarget ?? "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {forecast.forecastedTargetDate ?? "N/A"}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="w-3.5 h-3.5 text-yellow-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant={forecast.onTrack ? "default" : "destructive"} className="text-xs">
              {forecast.onTrack ? "On Track" : "Behind"}
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Confidence: {forecast.confidence}
          </p>
        </div>
      </div>

      {/* Progress to target */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-foreground">
            Progress to {fmtCount(forecast.targetSubs)} subscribers
          </p>
          <p className="text-sm font-mono text-muted-foreground">
            {fmtCount(forecast.currentSubs)} / {fmtCount(forecast.targetSubs)}
          </p>
        </div>
        <Progress value={progressToTarget} className="h-3" />
        <p className="text-[10px] text-muted-foreground mt-1">
          {progressToTarget.toFixed(1)}% complete — {fmtCount(forecast.targetSubs - forecast.currentSubs)} remaining
        </p>
      </div>

      {/* Forecast Chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">90-Day Subscriber Forecast</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={forecast.forecastPoints}>
            <defs>
              <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtCount} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtCount(v)} />
            <Legend />
            <Area type="monotone" dataKey="actual" stroke="#3b82f6" fill="url(#gradActual)" name="Actual" />
            <Area type="monotone" dataKey="forecast" stroke="#22c55e" fill="url(#gradForecast)" strokeDasharray="5 5" name="Forecast" />
            <Line type="monotone" dataKey="optimistic" stroke="#22c55e" strokeDasharray="2 2" dot={false} name="Optimistic" strokeOpacity={0.5} />
            <Line type="monotone" dataKey="conservative" stroke="#eab308" strokeDasharray="2 2" dot={false} name="Conservative" strokeOpacity={0.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Milestones */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Milestone Tracker</h3>
        <div className="space-y-2">
          {forecast.milestones.map((m) => (
            <div key={m.value} className="flex items-center gap-3">
              {m.reached ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-medium ${m.reached ? "text-green-500" : "text-foreground"}`}>
                    {m.label} subscribers
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.reached ? "Reached" : m.date ?? "—"}
                  </p>
                </div>
                <Progress value={m.reached ? 100 : Math.min(100, ((forecast.currentSubs - (m.value * 0.5)) / (m.value * 0.5)) * 100)} className="h-1 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
