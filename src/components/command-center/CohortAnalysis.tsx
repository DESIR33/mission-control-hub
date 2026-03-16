import {
  Users, TrendingUp, Calendar, Target, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { BudgetCard } from "@/components/ui/analytics-bento";
import { useCohortAnalysis } from "@/hooks/use-cohort-analysis";
import {
  chartTooltipStyle,
  cartesianGridDefaults,
  xAxisDefaults,
  yAxisDefaults,
  fmtCount,
} from "@/lib/chart-theme";

export function CohortAnalysis() {
  const { data: analysis, isLoading } = useCohortAnalysis();

  if (isLoading) {
    return <div className="rounded-xl border border-border bg-card p-6 animate-pulse h-96" />;
  }

  if (!analysis) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No cohort data available yet.</p>
        <p className="text-xs mt-1">Cohort analysis requires daily channel analytics data.</p>
      </div>
    );
  }

  const cohortChartData = analysis.cohorts.slice(-20).map((c) => ({
    week: c.week.replace("yyyy-", ""),
    gained: c.subsGained,
    lost: -c.subsLost,
    net: c.netSubs,
  }));

  const paceChartData = analysis.cohorts.slice(-20).map((c, i) => {
    const weekIndex = analysis.cohorts.length - 20 + i;
    return {
      week: c.week.replace("yyyy-", ""),
      actual: c.netSubs,
      required: Math.round(analysis.requiredWeeklyRate),
    };
  });

  const isOnPace = analysis.actualWeeklyRate >= analysis.requiredWeeklyRate;

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Weekly Avg</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">+{Math.round(analysis.weeklyAvgGain)}</p>
          <p className="text-xs text-muted-foreground">subs/week</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Best Week</p>
          </div>
          <p className="text-sm font-semibold text-foreground">{analysis.bestCohortWeek?.week ?? "—"}</p>
          <p className="text-xs text-muted-foreground">
            +{fmtCount(analysis.bestCohortWeek?.netSubs ?? 0)} subs
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-purple-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Weeks to 50K</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">
            {analysis.weeksTo50K === Infinity ? "—" : analysis.weeksTo50K}
          </p>
          <p className="text-xs text-muted-foreground">at current rate</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            {isOnPace ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
            )}
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Pace</p>
          </div>
          <p className={`text-lg font-bold font-mono ${isOnPace ? "text-green-400" : "text-red-400"}`}>
            {Math.round(analysis.actualWeeklyRate)}/{Math.round(analysis.requiredWeeklyRate)}
          </p>
          <p className="text-xs text-muted-foreground">actual/required per week</p>
        </div>
      </div>

      {/* Weekly Cohort Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Weekly Subscriber Cohorts</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={cohortChartData}>
            <CartesianGrid {...cartesianGridDefaults} />
            <XAxis dataKey="week" {...xAxisDefaults} />
            <YAxis {...yAxisDefaults} tickFormatter={fmtCount} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Bar dataKey="gained" fill="#22c55e" name="Gained" radius={[6, 6, 0, 0]} maxBarSize={48} animationDuration={800} />
            <Bar dataKey="lost" fill="#ef4444" name="Lost" radius={[0, 0, 6, 6]} maxBarSize={48} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pace Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Actual vs Required Growth Rate</h3>
        <BudgetCard />
      </div>

      {/* Content Type Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Sticky Content</h3>
          <p className="text-xs text-muted-foreground mb-2">Content types that drive sustainable subscribers</p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.stickyContentTypes.map((type) => (
              <Badge key={type} variant="outline" className="text-xs capitalize bg-green-500/10 text-green-400 border-green-500/30">
                {type}
              </Badge>
            ))}
            {analysis.stickyContentTypes.length === 0 && (
              <p className="text-xs text-muted-foreground">Not enough data yet</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Tourist Content</h3>
          <p className="text-xs text-muted-foreground mb-2">Views but lower subscriber retention</p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.touristContentTypes.map((type) => (
              <Badge key={type} variant="outline" className="text-xs capitalize bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                {type}
              </Badge>
            ))}
            {analysis.touristContentTypes.length === 0 && (
              <p className="text-xs text-muted-foreground">Not enough data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
