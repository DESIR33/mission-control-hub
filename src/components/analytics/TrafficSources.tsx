import { useMemo } from "react";
import { Route } from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { TrafficSource } from "@/hooks/use-youtube-analytics-api";

const SOURCE_LABELS: Record<string, string> = {
  ADVERTISING: "Ads",
  ANNOTATION: "Annotations",
  CAMPAIGN_CARD: "Campaign Cards",
  END_SCREEN: "End Screens",
  EXT_URL: "External URLs",
  HASHTAGS: "Hashtags",
  LIVE_REDIRECT: "Live Redirects",
  NO_LINK_EMBEDDED: "Embedded (no link)",
  NO_LINK_OTHER: "Other (no link)",
  NOTIFICATION: "Notifications",
  PLAYLIST: "Playlists",
  PROMOTED: "Promoted",
  RELATED_VIDEO: "Suggested",
  SHORTS: "Shorts Feed",
  SUBSCRIBER: "Subscribers",
  YT_CHANNEL: "Channel Page",
  YT_OTHER_PAGE: "Other YouTube",
  YT_PLAYLIST_PAGE: "Playlist Page",
  YT_SEARCH: "YouTube Search",
};

const COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#22c55e",
  "#06b6d4", "#ef4444", "#6366f1", "#14b8a6", "#f97316",
  "#a855f7", "#64748b", "#84cc16", "#0ea5e9",
];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

interface Props {
  data: TrafficSource[];
}

export function TrafficSources({ data }: Props) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => b.views - a.views),
    [data]
  );

  const totalViews = useMemo(() => sorted.reduce((s, d) => s + d.views, 0), [sorted]);

  const chartData = useMemo(
    () =>
      sorted.map((d) => ({
        source: SOURCE_LABELS[d.source_type] ?? d.source_type.replace(/_/g, " "),
        views: d.views,
        watchTime: Math.round(d.estimated_minutes_watched / 60),
        pct: totalViews > 0 ? +((d.views / totalViews) * 100).toFixed(1) : 0,
      })),
    [sorted, totalViews]
  );

  const pieData = useMemo(
    () =>
      chartData.slice(0, 8).map((d, i) => ({
        name: d.source,
        value: d.views,
        color: COLORS[i % COLORS.length],
      })),
    [chartData]
  );

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
        <Route className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No traffic source data available. Sync YouTube Analytics to see where your views come from.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top source callout */}
      {chartData.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Route className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Traffic Insights</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Your top traffic source is{" "}
            <span className="font-semibold text-foreground">{chartData[0].source}</span>{" "}
            driving <span className="font-mono font-semibold text-foreground">{chartData[0].pct}%</span> of views
            ({fmtCount(chartData[0].views)} views).
            {chartData.length > 1 && (
              <> Followed by <span className="font-semibold text-foreground">{chartData[1].source}</span> at {chartData[1].pct}%.</>
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Horizontal bar chart */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Views by Source</h3>
          <ResponsiveContainer width="100%" height={Math.max(chartData.length * 36, 200)}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtCount} />
              <YAxis type="category" dataKey="source" tick={{ fontSize: 10 }} width={120} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toLocaleString(), "Views"]} />
              <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Source Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [v.toLocaleString(), "Views"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data table */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">All Traffic Sources</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Source</th>
                <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Views</th>
                <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">% of Total</th>
                <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Watch Time</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => (
                <tr key={row.source} className="border-b border-border/50">
                  <td className="py-2 px-2 font-medium text-foreground">{row.source}</td>
                  <td className="py-2 px-2 text-right font-mono text-foreground">{row.views.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right font-mono text-foreground">{row.pct}%</td>
                  <td className="py-2 px-2 text-right font-mono text-muted-foreground">{row.watchTime}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
