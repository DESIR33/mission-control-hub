import {
  Clock, TrendingUp, TrendingDown, Eye, Users,
  BarChart3, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { BudgetCard } from "@/components/ui/analytics-bento";
import { useRetentionAnalysis } from "@/hooks/use-retention-analysis";
import { fmtCount, chartTooltipStyle, xAxisDefaults, yAxisDefaults, cartesianGridDefaults } from "@/lib/chart-theme";

const categoryColor: Record<string, string> = {
  excellent: "#22c55e",
  good: "#3b82f6",
  average: "#eab308",
  poor: "#ef4444",
};

const categoryBadge: Record<string, string> = {
  excellent: "default",
  good: "secondary",
  average: "outline",
  poor: "destructive",
};

export function RetentionAnalyzer() {
  const { data: analysis, isLoading } = useRetentionAnalysis();

  if (isLoading) {
    return <div className="rounded-xl border border-border bg-card p-6 animate-pulse h-96" />;
  }

  if (!analysis) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No retention data available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Retention</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{analysis.avgRetention.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">YouTube avg ~40%</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-purple-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Median</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{analysis.medianRetention.toFixed(1)}%</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Top 5 Avg</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">
            {analysis.topRetention.length > 0
              ? (analysis.topRetention.reduce((s, v) => s + v.retention, 0) / analysis.topRetention.length).toFixed(1)
              : "—"}%
          </p>
        </div>
      </div>

      {/* Insights */}
      {analysis.insights.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Insights</h3>
          <ul className="space-y-1">
            {analysis.insights.map((insight, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <ArrowUpRight className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Retention Distribution */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Retention Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={analysis.buckets}>
            <CartesianGrid {...cartesianGridDefaults} />
            <XAxis dataKey="range" {...xAxisDefaults} />
            <YAxis {...yAxisDefaults} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Bar dataKey="count" name="Videos" radius={[6, 6, 0, 0]} maxBarSize={48}>
              {analysis.buckets.map((b, i) => (
                <Cell key={i} fill={["#ef4444", "#eab308", "#3b82f6", "#22c55e", "#22c55e"][i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Retention vs Views Scatter */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Retention vs Views</h3>
        <ResponsiveContainer width="100%" height={250}>
          <ScatterChart>
            <CartesianGrid {...cartesianGridDefaults} />
            <XAxis dataKey="retention" name="Retention %" {...xAxisDefaults} unit="%" />
            <YAxis dataKey="views" name="Views" {...yAxisDefaults} tickFormatter={fmtCount} />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(v: number, name: string) => [name === "Views" ? fmtCount(v) : `${v}%`, name]}
              labelFormatter={() => ""}
            />
            <Scatter data={analysis.retentionVsViews} fill="#3b82f6" fillOpacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Retention Trend */}
      {analysis.retentionTrend.length > 5 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Retention Trend</h3>
          <BudgetCard />
        </div>
      )}

      {/* Top & Bottom Videos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            Highest Retention
          </h3>
          <div className="space-y-2">
            {analysis.topRetention.map((v) => (
              <div key={v.videoId} className="flex items-center gap-2">
                <Badge variant={categoryBadge[v.category] as any} className="text-xs shrink-0">
                  {v.retention.toFixed(0)}%
                </Badge>
                <p className="text-xs text-foreground truncate flex-1">{v.title}</p>
                <p className="text-xs text-muted-foreground shrink-0">{fmtCount(v.views)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            Lowest Retention
          </h3>
          <div className="space-y-2">
            {analysis.lowRetention.map((v) => (
              <div key={v.videoId} className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs shrink-0">
                  {v.retention.toFixed(0)}%
                </Badge>
                <p className="text-xs text-foreground truncate flex-1">{v.title}</p>
                <p className="text-xs text-muted-foreground shrink-0">{fmtCount(v.views)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
