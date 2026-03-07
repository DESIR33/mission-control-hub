import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, TrendingUp, Banknote, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, subDays } from "date-fns";
import { fmtCount, fmtMoney, pctChange, chartTooltipStyle, xAxisDefaults, yAxisDefaults, cartesianGridDefaults, SEMANTIC_COLORS, lineDefaults, barDefaults, horizontalBarDefaults, CHART_COLORS } from "@/lib/chart-theme";
import type { ChannelAnalytics } from "@/hooks/use-youtube-analytics-api";
import type { VideoAnalytics } from "@/hooks/use-youtube-analytics-api";

interface Props {
  channelData: ChannelAnalytics[];
  videoData: VideoAnalytics[];
  daysRange: number;
}

export function RevenueAnalytics({ channelData, videoData, daysRange }: Props) {
  const navigate = useNavigate();

  // ── Period splitting: current period (last daysRange days) & previous period ──
  const { currentPeriod, previousPeriod } = useMemo(() => {
    const now = new Date();
    const currentCutoff = subDays(now, daysRange);
    const previousCutoff = subDays(now, daysRange * 2);

    const current = channelData
      .filter((d) => {
        const dt = new Date(d.date);
        return dt >= currentCutoff;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const previous = channelData
      .filter((d) => {
        const dt = new Date(d.date);
        return dt >= previousCutoff && dt < currentCutoff;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { currentPeriod: current, previousPeriod: previous };
  }, [channelData, daysRange]);

  // Use currentPeriod as the main filtered data (preserving existing behavior)
  const filtered = currentPeriod;

  // ── Aggregate totals for current period ──
  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, d) => ({
        revenue: acc.revenue + d.estimated_revenue,
        adRevenue: acc.adRevenue + d.estimated_ad_revenue,
        redRevenue: acc.redRevenue + d.estimated_red_partner_revenue,
        grossRevenue: acc.grossRevenue + d.gross_revenue,
        adImpressions: acc.adImpressions + d.ad_impressions,
        monetizedPlaybacks: acc.monetizedPlaybacks + d.monetized_playbacks,
        views: acc.views + d.views,
      }),
      { revenue: 0, adRevenue: 0, redRevenue: 0, grossRevenue: 0, adImpressions: 0, monetizedPlaybacks: 0, views: 0 }
    );
  }, [filtered]);

  // ── Aggregate totals for previous period ──
  const prevTotals = useMemo(() => {
    return previousPeriod.reduce(
      (acc, d) => ({
        revenue: acc.revenue + d.estimated_revenue,
        adRevenue: acc.adRevenue + d.estimated_ad_revenue,
        redRevenue: acc.redRevenue + d.estimated_red_partner_revenue,
        grossRevenue: acc.grossRevenue + d.gross_revenue,
        adImpressions: acc.adImpressions + d.ad_impressions,
        monetizedPlaybacks: acc.monetizedPlaybacks + d.monetized_playbacks,
        views: acc.views + d.views,
      }),
      { revenue: 0, adRevenue: 0, redRevenue: 0, grossRevenue: 0, adImpressions: 0, monetizedPlaybacks: 0, views: 0 }
    );
  }, [previousPeriod]);

  const avgCpm = useMemo(() => {
    const withCpm = filtered.filter((d) => d.cpm > 0);
    if (withCpm.length === 0) return 0;
    return +(withCpm.reduce((s, d) => s + d.cpm, 0) / withCpm.length).toFixed(2);
  }, [filtered]);

  const prevAvgCpm = useMemo(() => {
    const withCpm = previousPeriod.filter((d) => d.cpm > 0);
    if (withCpm.length === 0) return 0;
    return +(withCpm.reduce((s, d) => s + d.cpm, 0) / withCpm.length).toFixed(2);
  }, [previousPeriod]);

  const avgPlaybackCpm = useMemo(() => {
    const withCpm = filtered.filter((d) => d.playback_based_cpm > 0);
    if (withCpm.length === 0) return 0;
    return +(withCpm.reduce((s, d) => s + d.playback_based_cpm, 0) / withCpm.length).toFixed(2);
  }, [filtered]);

  const rpm = useMemo(() => {
    return totals.views > 0 ? +((totals.revenue / totals.views) * 1000).toFixed(2) : 0;
  }, [totals]);

  const prevRpm = useMemo(() => {
    return prevTotals.views > 0 ? +((prevTotals.revenue / prevTotals.views) * 1000).toFixed(2) : 0;
  }, [prevTotals]);

  // ── Period-over-period deltas ──
  const deltas = useMemo(() => ({
    revenue: pctChange(totals.revenue, prevTotals.revenue),
    adRevenue: pctChange(totals.adRevenue, prevTotals.adRevenue),
    redRevenue: pctChange(totals.redRevenue, prevTotals.redRevenue),
    rpm: pctChange(rpm, prevRpm),
    avgCpm: pctChange(avgCpm, prevAvgCpm),
    monetizedPlaybacks: pctChange(totals.monetizedPlaybacks, prevTotals.monetizedPlaybacks),
  }), [totals, prevTotals, rpm, prevRpm, avgCpm, prevAvgCpm]);

  const dailyChartData = useMemo(
    () =>
      filtered.map((d) => ({
        date: format(new Date(d.date), "MMM d"),
        revenue: +d.estimated_revenue.toFixed(2),
        adRevenue: +d.estimated_ad_revenue.toFixed(2),
        premiumRevenue: +d.estimated_red_partner_revenue.toFixed(2),
        cpm: +d.cpm.toFixed(2),
      })),
    [filtered]
  );

  // ── Revenue Source Breakdown (donut chart data) ──
  const revenueSourceData = useMemo(() => {
    const ad = totals.adRevenue;
    const premium = totals.redRevenue;
    const other = Math.max(0, totals.grossRevenue - ad - premium);
    return [
      { name: "Ad Revenue", value: +ad.toFixed(2), color: "#22c55e" },
      { name: "Premium Revenue", value: +premium.toFixed(2), color: "#ef4444" },
      { name: "Other", value: +other.toFixed(2), color: "#3b82f6" },
    ].filter((s) => s.value > 0);
  }, [totals]);

  // ── Top earning videos ──
  const topEarningVideos = useMemo(
    () =>
      [...videoData]
        .filter((v) => v.estimated_revenue > 0)
        .sort((a, b) => b.estimated_revenue - a.estimated_revenue)
        .slice(0, 10),
    [videoData]
  );

  // ── RPM Ranking Chart data ──
  const rpmRankingData = useMemo(() => {
    return [...videoData]
      .filter((v) => v.estimated_revenue > 0 && v.views > 100)
      .map((v) => ({
        title: v.title || "Untitled Video",
        rpm: +((v.estimated_revenue / v.views) * 1000).toFixed(2),
        videoId: v.youtube_video_id,
      }))
      .sort((a, b) => b.rpm - a.rpm)
      .slice(0, 10);
  }, [videoData]);

  const hasRevenue = totals.revenue > 0;

  if (!hasRevenue && topEarningVideos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <DollarSign className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No revenue data available. Revenue analytics require a monetized YouTube channel with YouTube Analytics API access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <RevenueKpi label="Est. Revenue" value={fmtMoney(totals.revenue)} sub={`${daysRange}d total`} delta={deltas.revenue} />
        <RevenueKpi label="Ad Revenue" value={fmtMoney(totals.adRevenue)} sub="from ads" delta={deltas.adRevenue} />
        <RevenueKpi label="Premium Revenue" value={fmtMoney(totals.redRevenue)} sub="YouTube Premium" delta={deltas.redRevenue} />
        <RevenueKpi label="RPM" value={`$${rpm}`} sub="per 1K views" delta={deltas.rpm} />
        <RevenueKpi label="Avg CPM" value={`$${avgCpm}`} sub="cost per mille" delta={deltas.avgCpm} />
        <RevenueKpi label="Monetized Plays" value={fmtCount(totals.monetizedPlaybacks)} sub="ad-served" delta={deltas.monetizedPlaybacks} />
      </div>

      {/* Revenue trend + donut */}
      {dailyChartData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Daily Revenue Breakdown</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyChartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <defs>
                  <linearGradient id="adRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="premRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...cartesianGridDefaults} />
                <XAxis dataKey="date" {...xAxisDefaults} />
                <YAxis {...yAxisDefaults} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number, name: string) => {
                  const labels: Record<string, string> = {
                    adRevenue: "Ad Revenue",
                    premiumRevenue: "Premium Revenue",
                    revenue: "Total Revenue",
                  };
                  return [fmtMoney(v), labels[name] ?? name];
                }} />
                <Legend formatter={(value) => {
                  const labels: Record<string, string> = {
                    adRevenue: "Ad Revenue",
                    premiumRevenue: "Premium",
                  };
                  return labels[value] ?? value;
                }} />
                <Area type="monotone" dataKey="adRevenue" stroke="#22c55e" strokeWidth={2.5} fill="url(#adRevGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }} />
                <Area type="monotone" dataKey="premiumRevenue" stroke="#ef4444" strokeWidth={2.5} fill="url(#premRevGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">CPM Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyChartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid {...cartesianGridDefaults} />
                <XAxis dataKey="date" {...xAxisDefaults} />
                <YAxis {...yAxisDefaults} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`$${v}`, "CPM"]} />
                <Line type="monotone" dataKey="cpm" stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Revenue Source Breakdown Donut Chart */}
      {revenueSourceData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Revenue Source Breakdown</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={revenueSourceData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="85%"
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {revenueSourceData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(v: number, name: string) => [fmtMoney(v), name]}
                />
                <Legend
                  formatter={(value) => value}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Earning Videos */}
      {topEarningVideos.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Banknote className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-semibold text-foreground">Top Earning Videos</h3>
          </div>
          <div className="space-y-2">
            {topEarningVideos.map((v, i) => (
              <div
                key={v.youtube_video_id}
                className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/40 cursor-pointer transition-colors"
                onClick={() => navigate(`/analytics/videos/${v.youtube_video_id}`)}
              >
                <span className="text-sm font-bold text-muted-foreground font-mono w-6 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{v.title || "Untitled Video"}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">{fmtCount(v.views)} views</span>
                    <span className="text-xs text-muted-foreground">{v.impressions_ctr.toFixed(1)}% CTR</span>
                    <span className="text-xs text-muted-foreground">RPM: ${v.views > 0 ? ((v.estimated_revenue / v.views) * 1000).toFixed(2) : "0"}</span>
                  </div>
                </div>
                <span className="text-sm font-mono font-bold text-green-500">{fmtMoney(v.estimated_revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RPM Ranking Chart */}
      {rpmRankingData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">RPM Ranking (Top 10 Videos)</h3>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(300, rpmRankingData.length * 40)}>
            <BarChart data={rpmRankingData} layout="vertical" margin={{ left: 20, right: 30 }}>
              <CartesianGrid {...cartesianGridDefaults} horizontal={false} />
              <XAxis
                type="number"
                {...xAxisDefaults}
                tickFormatter={(v) => `$${v}`}
              />
              <YAxis
                type="category"
                dataKey="title"
                {...yAxisDefaults}
                width={180}
                tickFormatter={(value: string) => value.length > 28 ? `${value.slice(0, 28)}...` : value}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v: number) => [`$${v.toFixed(2)}`, "RPM"]}
              />
              <Bar dataKey="rpm" fill="#f59e0b" radius={[0, 6, 6, 0]} maxBarSize={32} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function RevenueKpi({
  label,
  value,
  sub,
  delta,
}: {
  label: string;
  value: string;
  sub: string;
  delta?: number | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4 transition-colors hover:bg-card/80">
      <div className="flex items-center gap-1.5 mb-1">
        <DollarSign className="w-3.5 h-3.5 text-green-500" />
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-lg font-bold font-mono text-foreground mt-0.5">{value}</p>
        {delta != null && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              delta >= 0
                ? "text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-950"
                : "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950"
            }`}
          >
            {delta >= 0 ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {delta >= 0 ? `+${delta}%` : `${delta}%`}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
