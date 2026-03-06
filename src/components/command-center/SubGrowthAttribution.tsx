import { useState } from "react";
import {
  UserPlus, TrendingUp, Award, Lightbulb, Film,
  ChevronDown, ChevronUp,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { useSubAttribution } from "@/hooks/use-sub-attribution";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

export function SubGrowthAttribution() {
  const { data: attribution, isLoading } = useSubAttribution();
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return <div className="rounded-lg border border-border bg-card p-6 animate-pulse h-96" />;
  }

  if (!attribution) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No subscriber attribution data available yet.</p>
        <p className="text-xs mt-1">Data appears after YouTube Analytics syncs video-level subscriber data.</p>
      </div>
    );
  }

  const topVideos = showAll ? attribution.videos : attribution.videos.slice(0, 15);
  const chartData = topVideos.map((v) => ({
    name: v.title.length > 25 ? v.title.substring(0, 25) + "…" : v.title,
    subs: v.netSubs,
    efficiency: Math.round(v.efficiencyScore * 10) / 10,
  }));

  const pieData = attribution.categories.slice(0, 7).map((c) => ({
    name: c.category,
    value: Math.max(0, c.totalSubs),
  }));

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <UserPlus className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Subs</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{fmtCount(attribution.totalSubsFromContent)}</p>
          <p className="text-xs text-muted-foreground">from tracked content</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Award className="w-3.5 h-3.5 text-yellow-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Best Video</p>
          </div>
          <p className="text-sm font-semibold text-foreground truncate">
            {attribution.bestVideo?.title ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            +{fmtCount(attribution.bestVideo?.netSubs ?? 0)} subs
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Film className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Best Type</p>
          </div>
          <p className="text-sm font-semibold text-foreground capitalize">{attribution.bestCategory}</p>
          <p className="text-xs text-muted-foreground">highest net subs</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Efficiency</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">
            {attribution.avgEfficiency.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">subs per 1K views</p>
        </div>
      </div>

      {/* Subscriber Gain by Video */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Top Videos by Subscriber Gain</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtCount} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={150} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtCount(v)} />
            <Bar dataKey="subs" fill="#22c55e" radius={[0, 4, 4, 0]} name="Net Subscribers" />
          </BarChart>
        </ResponsiveContainer>
        {attribution.videos.length > 15 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {showAll ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showAll ? "Show less" : `Show all ${attribution.videos.length} videos`}
          </button>
        )}
      </div>

      {/* Category Breakdown */}
      {pieData.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Subscribers by Content Type</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {attribution.categories.slice(0, 5).map((cat, i) => (
                <div key={cat.category} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-foreground capitalize flex-1">{cat.category}</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {fmtCount(cat.totalSubs)} · {cat.avgEfficiency.toFixed(1)}/1K
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {attribution.recommendations.length > 0 && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-green-500" />
            Recommendations
          </h3>
          <ul className="space-y-1.5">
            {attribution.recommendations.map((rec, i) => (
              <li key={i} className="text-xs text-muted-foreground">{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
