import { useMemo } from "react";
import { Route, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { subDays } from "date-fns";
import type { TrafficSource } from "@/hooks/use-youtube-analytics-api";
import { safeFormat } from "@/lib/date-utils";
import { fmtCount, chartTooltipStyle, xAxisDefaults, yAxisDefaults, cartesianGridDefaults, CHART_COLORS, horizontalBarDefaults } from "@/lib/chart-theme";

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

const sourceLabel = (sourceType: string) =>
  SOURCE_LABELS[sourceType] ?? sourceType.replace(/_/g, " ");

interface AggregatedSource {
  source_type: string;
  source: string;
  views: number;
  estimated_minutes_watched: number;
  minutesPerView: number;
  watchTime: number;
  pct: number;
  prevViews: number;
  prevMinutesWatched: number;
  changePercent: number | null;
  isNew: boolean;
}

interface Props {
  data: TrafficSource[];
  daysRange: number;
}

export function TrafficSources({ data, daysRange }: Props) {
  // Split data into current and previous periods
  const { currentRaw, currentAgg, previousAgg } = useMemo(() => {
    const now = new Date();
    const currentCutoff = subDays(now, daysRange);
    const previousCutoff = subDays(now, daysRange * 2);

    const currentRows = data.filter((d) => new Date(d.date) >= currentCutoff);
    const previousRows = data.filter((d) => {
      const dt = new Date(d.date);
      return dt >= previousCutoff && dt < currentCutoff;
    });

    // Aggregate by source_type
    const aggBy = (rows: TrafficSource[]) => {
      const map = new Map<string, { views: number; minutes: number }>();
      for (const r of rows) {
        const existing = map.get(r.source_type);
        if (existing) {
          existing.views += r.views;
          existing.minutes += r.estimated_minutes_watched;
        } else {
          map.set(r.source_type, { views: r.views, minutes: r.estimated_minutes_watched });
        }
      }
      return map;
    };

    return {
      currentRaw: currentRows,
      currentAgg: aggBy(currentRows),
      previousAgg: aggBy(previousRows),
    };
  }, [data, daysRange]);

  // Build sorted chart data with trend info
  const { chartData, totalViews } = useMemo(() => {
    const total = Array.from(currentAgg.values()).reduce((s, d) => s + d.views, 0);

    const rows: AggregatedSource[] = Array.from(currentAgg.entries()).map(
      ([sourceType, cur]) => {
        const prev = previousAgg.get(sourceType);
        const prevViews = prev?.views ?? 0;
        const prevMinutes = prev?.minutes ?? 0;
        const isNew = !prev;
        const changePercent =
          isNew || prevViews === 0
            ? null
            : ((cur.views - prevViews) / prevViews) * 100;

        const minutesPerView = cur.views > 0 ? cur.minutes / cur.views : 0;

        return {
          source_type: sourceType,
          source: sourceLabel(sourceType),
          views: cur.views,
          estimated_minutes_watched: cur.minutes,
          minutesPerView,
          watchTime: Math.round(cur.minutes / 60),
          pct: total > 0 ? +((cur.views / total) * 100).toFixed(1) : 0,
          prevViews,
          prevMinutesWatched: prevMinutes,
          changePercent,
          isNew,
        };
      }
    );

    rows.sort((a, b) => b.views - a.views);

    return { chartData: rows, totalViews: total };
  }, [currentAgg, previousAgg]);

  // Pie data (top 8 sources)
  const pieData = useMemo(
    () =>
      chartData.slice(0, 8).map((d, i) => ({
        name: d.source,
        value: d.views,
        color: CHART_COLORS[i % CHART_COLORS.length],
      })),
    [chartData]
  );

  // Watch time efficiency data sorted by minutesPerView desc
  const efficiencyData = useMemo(
    () =>
      [...chartData]
        .filter((d) => d.views > 0)
        .sort((a, b) => b.minutesPerView - a.minutesPerView)
        .map((d) => ({
          source: d.source,
          minutesPerView: +d.minutesPerView.toFixed(2),
        })),
    [chartData]
  );

  // Watch time efficiency insight
  const efficiencyInsight = useMemo(() => {
    if (efficiencyData.length < 2) return null;
    const best = efficiencyData[0];
    const avgMpv =
      chartData.reduce((s, d) => s + d.estimated_minutes_watched, 0) /
      Math.max(totalViews, 1);
    if (avgMpv === 0) return null;
    const ratio = best.minutesPerView / avgMpv;
    return {
      source: best.source,
      ratio: ratio.toFixed(1),
    };
  }, [efficiencyData, chartData, totalViews]);

  // Feature 8: Traffic Source Trend Chart data
  const { trendChartData, top5Sources } = useMemo(() => {
    // Get top 5 sources by total views in current period
    const top5 = chartData.slice(0, 5).map((d) => d.source_type);
    const top5Labels = top5.map((st) => sourceLabel(st));

    // Group currentRaw by date, then by source
    const dateMap = new Map<string, Record<string, number>>();
    for (const row of currentRaw) {
      const dateKey = safeFormat(row.date, "yyyy-MM-dd");
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {});
      }
      const entry = dateMap.get(dateKey)!;
      const label = sourceLabel(row.source_type);
      if (top5Labels.includes(label)) {
        entry[label] = (entry[label] ?? 0) + row.views;
      }
    }

    // Convert to sorted array
    const sortedDates = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, sources]) => ({
        date: safeFormat(date, "MMM d"),
        ...sources,
      }));

    return { trendChartData: sortedDates, top5Sources: top5Labels };
  }, [currentRaw, chartData]);

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <Route className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No traffic source data available. Sync YouTube Analytics to see where your views come from.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top source callout */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
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
          {efficiencyInsight && (
            <p className="text-sm text-muted-foreground mt-1">
              Viewers from{" "}
              <span className="font-semibold text-foreground">{efficiencyInsight.source}</span>{" "}
              watch <span className="font-mono font-semibold text-foreground">{efficiencyInsight.ratio}x</span>{" "}
              longer per view than average.
            </p>
          )}
        </div>
      )}

      {/* Feature 8: Traffic Source Trend Chart (stacked area) */}
      {trendChartData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Traffic Source Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendChartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid {...cartesianGridDefaults} />
              <XAxis dataKey="date" {...xAxisDefaults} />
              <YAxis {...yAxisDefaults} tickFormatter={fmtCount} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              {top5Sources.map((source, i) => (
                <Area
                  key={source}
                  type="monotone"
                  dataKey={source}
                  stackId="1"
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  fillOpacity={0.5}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Horizontal bar chart */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Views by Source</h3>
          <ResponsiveContainer width="100%" height={Math.max(chartData.length * 36, 200)}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid {...cartesianGridDefaults} />
              <XAxis type="number" {...xAxisDefaults} tickFormatter={fmtCount} />
              <YAxis type="category" dataKey="source" {...yAxisDefaults} width={120} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [v.toLocaleString(), "Views"]} />
              <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Source Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v: number) => [v.toLocaleString(), "Views"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feature 7: Watch Time Efficiency bar chart */}
      {efficiencyData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Watch Time Efficiency</h3>
          <ResponsiveContainer width="100%" height={Math.max(efficiencyData.length * 36, 200)}>
            <BarChart data={efficiencyData} layout="vertical">
              <CartesianGrid {...cartesianGridDefaults} />
              <XAxis type="number" {...xAxisDefaults} tickFormatter={(v: number) => `${v.toFixed(1)}m`} />
              <YAxis type="category" dataKey="source" {...yAxisDefaults} width={120} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v: number) => [`${v.toFixed(1)}m`, "Avg Watch/View"]}
              />
              <Bar dataKey="minutesPerView" fill="#8b5cf6" radius={[0, 6, 6, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Data table */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">All Traffic Sources</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Source</th>
                <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Views</th>
                <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">% of Total</th>
                <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Watch Time</th>
                <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Avg Watch/View</th>
                <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Trend</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => (
                <tr key={row.source} className="border-b border-border/50">
                  <td className="py-2 px-2 font-medium text-foreground">{row.source}</td>
                  <td className="py-2 px-2 text-right font-mono text-foreground">{row.views.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right font-mono text-foreground">{row.pct}%</td>
                  <td className="py-2 px-2 text-right font-mono text-muted-foreground">{row.watchTime}h</td>
                  <td className="py-2 px-2 text-right font-mono text-muted-foreground">
                    {row.minutesPerView.toFixed(1)}m
                  </td>
                  <td className="py-2 px-2 text-right">
                    {row.isNew ? (
                      <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500">
                        New
                      </span>
                    ) : row.changePercent !== null ? (
                      <span
                        className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                          row.changePercent >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {row.changePercent >= 0 ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {Math.abs(row.changePercent).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
