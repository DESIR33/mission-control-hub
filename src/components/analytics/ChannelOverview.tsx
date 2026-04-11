import { useMemo } from "react";
import {
  Eye, Clock, Users, TrendingDown, ArrowUpRight,
  ArrowDownRight, MousePointerClick, Share2, ThumbsUp, MessageSquare,
  Tv, Zap,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format, subDays } from "date-fns";
import type { ChannelAnalytics } from "@/hooks/use-youtube-analytics-api";
import { safeFormat, safeGetTime } from "@/lib/date-utils";
import {
  fmtCount, fmtDuration, fmtMoney, pctChange,
  chartTooltipStyle, xAxisDefaults, yAxisDefaults, cartesianGridDefaults,
  SEMANTIC_COLORS, lineDefaults, barDefaults,
} from "@/lib/chart-theme";

interface Props {
  data: ChannelAnalytics[];
  daysRange: number;
  currentSubscribers?: number;
}

export function ChannelOverview({ data, daysRange, currentSubscribers }: Props) {
  const filtered = useMemo(() => {
    const cutoff = subDays(new Date(), daysRange);
    return data
      .filter((d) => new Date(d.date) >= cutoff)
      .sort((a, b) => safeGetTime(a.date) - safeGetTime(b.date));
  }, [data, daysRange]);

  const prevFiltered = useMemo(() => {
    const currentCutoff = subDays(new Date(), daysRange);
    const prevCutoff = subDays(new Date(), daysRange * 2);
    return data
      .filter((d) => {
        const dt = new Date(d.date);
        return dt >= prevCutoff && dt < currentCutoff;
      })
      .sort((a, b) => safeGetTime(a.date) - safeGetTime(b.date));
  }, [data, daysRange]);

  const sumPeriod = (items: ChannelAnalytics[]) =>
    items.reduce(
      (acc, d) => ({
        views: acc.views + d.views,
        watchTime: acc.watchTime + d.estimated_minutes_watched,
        subsGained: acc.subsGained + d.subscribers_gained,
        subsLost: acc.subsLost + d.subscribers_lost,
        netSubs: acc.netSubs + d.net_subscribers,
        likes: acc.likes + d.likes,
        comments: acc.comments + d.comments,
        shares: acc.shares + d.shares,
        impressions: acc.impressions + d.impressions,
        uniqueViewers: acc.uniqueViewers + d.unique_viewers,
        revenue: acc.revenue + d.estimated_revenue,
        cardClicks: acc.cardClicks + d.card_clicks,
        endScreenClicks: acc.endScreenClicks + d.end_screen_element_clicks,
      }),
      {
        views: 0, watchTime: 0, subsGained: 0, subsLost: 0, netSubs: 0,
        likes: 0, comments: 0, shares: 0, impressions: 0, uniqueViewers: 0,
        revenue: 0, cardClicks: 0, endScreenClicks: 0,
      }
    );

  const totals = useMemo(() => {
    if (filtered.length === 0) return null;
    return sumPeriod(filtered);
  }, [filtered]);

  const prevTotals = useMemo(() => {
    if (prevFiltered.length === 0) return null;
    return sumPeriod(prevFiltered);
  }, [prevFiltered]);

  const deltas = useMemo(() => {
    if (!totals || !prevTotals) return null;
    return {
      views: pctChange(totals.views, prevTotals.views),
      watchTime: pctChange(totals.watchTime, prevTotals.watchTime),
      netSubs: pctChange(totals.netSubs, prevTotals.netSubs),
      impressions: pctChange(totals.impressions, prevTotals.impressions),
      likes: pctChange(totals.likes, prevTotals.likes),
      comments: pctChange(totals.comments, prevTotals.comments),
      cardClicks: pctChange(totals.cardClicks, prevTotals.cardClicks),
      endScreenClicks: pctChange(totals.endScreenClicks, prevTotals.endScreenClicks),
      revenue: pctChange(totals.revenue, prevTotals.revenue),
      engagement: pctChange(
        totals.likes + totals.comments + totals.shares,
        prevTotals.likes + prevTotals.comments + prevTotals.shares
      ),
    };
  }, [totals, prevTotals]);

  const avgCtr = useMemo(() => {
    const withViews = filtered.filter((d) => d.views > 0);
    if (withViews.length === 0) return 0;
    const totalViews = withViews.reduce((s, d) => s + d.views, 0);
    const weightedSum = withViews.reduce((s, d) => s + d.impressions_ctr * d.views, 0);
    return totalViews > 0 ? +(weightedSum / totalViews).toFixed(2) : 0;
  }, [filtered]);

  const avgDuration = useMemo(() => {
    const withViews = filtered.filter((d) => d.views > 0);
    if (withViews.length === 0) return 0;
    const totalViews = withViews.reduce((s, d) => s + d.views, 0);
    const weightedSum = withViews.reduce((s, d) => s + d.average_view_duration_seconds * d.views, 0);
    return totalViews > 0 ? Math.round(weightedSum / totalViews) : 0;
  }, [filtered]);

  const chartData = useMemo(
    () =>
      filtered.map((d) => ({
        date: safeFormat(d.date, "MMM d"),
        views: d.views,
        watchTime: Math.round(d.estimated_minutes_watched / 60),
        subs: d.net_subscribers,
        impressions: d.impressions,
        ctr: d.impressions_ctr,
        revenue: d.estimated_revenue,
        likes: d.likes,
        shares: d.shares,
        engagementRate:
          d.views > 0
            ? +((d.likes + d.comments + d.shares) / d.views * 100).toFixed(2)
            : 0,
        subsVelocity:
          d.views > 0
            ? +((d.net_subscribers / d.views) * 1000).toFixed(2)
            : 0,
      })),
    [filtered]
  );

  const avgSubsVelocity = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, d) => acc + d.subsVelocity, 0);
    return +(sum / chartData.length).toFixed(2);
  }, [chartData]);

  if (!totals || filtered.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <Tv className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No channel analytics data yet. Sync your YouTube Analytics to see detailed metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          icon={<Eye className="w-3.5 h-3.5" />}
          iconColor={SEMANTIC_COLORS.views}
          label="Views"
          value={fmtCount(totals.views)}
          sub={`${daysRange}d total`}
          change={deltas?.views ?? undefined}
          daysRange={daysRange}
        />
        <KpiCard
          icon={<Clock className="w-3.5 h-3.5" />}
          iconColor={SEMANTIC_COLORS.watchTime}
          label="Watch Time"
          value={totals.watchTime >= 60 ? `${Math.round(totals.watchTime / 60)}h` : `${totals.watchTime}m`}
          sub="estimated"
          change={deltas?.watchTime ?? undefined}
          daysRange={daysRange}
        />
        <KpiCard
          icon={<Users className="w-3.5 h-3.5" />}
          iconColor={SEMANTIC_COLORS.subscribers}
          label="Net Subscribers"
          value={`${totals.netSubs >= 0 ? "+" : ""}${fmtCount(totals.netSubs)}`}
          sub={`+${fmtCount(totals.subsGained)} / -${fmtCount(totals.subsLost)}`}
          positive={totals.netSubs >= 0}
          change={deltas?.netSubs ?? undefined}
          daysRange={daysRange}
        />
        <KpiCard
          icon={<MousePointerClick className="w-3.5 h-3.5" />}
          iconColor={SEMANTIC_COLORS.impressions}
          label="Impressions"
          value={fmtCount(totals.impressions)}
          sub={`${avgCtr}% CTR`}
          change={deltas?.impressions ?? undefined}
          daysRange={daysRange}
        />
        <KpiCard
          icon={<Zap className="w-3.5 h-3.5" />}
          iconColor="#eab308"
          label="Avg Duration"
          value={fmtDuration(avgDuration)}
          sub="per view"
        />
        <KpiCard
          icon={<Share2 className="w-3.5 h-3.5" />}
          iconColor={SEMANTIC_COLORS.engagement}
          label="Engagement"
          value={fmtCount(totals.likes + totals.comments + totals.shares)}
          sub={`${fmtCount(totals.likes)} likes · ${fmtCount(totals.shares)} shares`}
          change={deltas?.engagement ?? undefined}
          daysRange={daysRange}
        />
      </div>

      {/* Views + Watch Time Chart */}
      {chartData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Daily Views">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <defs>
                  <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SEMANTIC_COLORS.views} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={SEMANTIC_COLORS.views} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...cartesianGridDefaults} />
                <XAxis dataKey="date" {...xAxisDefaults} />
                <YAxis {...yAxisDefaults} tickFormatter={fmtCount} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [v.toLocaleString(), "Views"]} />
                <Area type="monotone" dataKey="views" stroke={SEMANTIC_COLORS.views} strokeWidth={2.5} fill="url(#viewsGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Watch Time (hours/day)">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <defs>
                  <linearGradient id="watchGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SEMANTIC_COLORS.watchTime} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={SEMANTIC_COLORS.watchTime} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...cartesianGridDefaults} />
                <XAxis dataKey="date" {...xAxisDefaults} />
                <YAxis {...yAxisDefaults} tickFormatter={(v) => `${v}h`} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`${v}h`, "Watch Time"]} />
                <Area type="monotone" dataKey="watchTime" stroke={SEMANTIC_COLORS.watchTime} strokeWidth={2.5} fill="url(#watchGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Subscribers + CTR Chart */}
      {chartData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Daily Net Subscribers">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid {...cartesianGridDefaults} />
                <XAxis dataKey="date" {...xAxisDefaults} />
                <YAxis {...yAxisDefaults} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [v >= 0 ? `+${v}` : v, "Net Subs"]} />
                <Bar
                  dataKey="subs"
                  radius={barDefaults.radius}
                  maxBarSize={barDefaults.maxBarSize}
                  fill={SEMANTIC_COLORS.subscribers}
                  animationDuration={800}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Impressions CTR %">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid {...cartesianGridDefaults} />
                <XAxis dataKey="date" {...xAxisDefaults} />
                <YAxis {...yAxisDefaults} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`${v}%`, "CTR"]} />
                <Line type="monotone" dataKey="ctr" stroke={SEMANTIC_COLORS.ctr} {...lineDefaults} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Engagement Rate Trend + Subscriber Velocity */}
      {chartData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Engagement Rate %">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid {...cartesianGridDefaults} />
                <XAxis dataKey="date" {...xAxisDefaults} />
                <YAxis {...yAxisDefaults} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`${v}%`, "Engagement Rate"]} />
                <Line type="monotone" dataKey="engagementRate" stroke={SEMANTIC_COLORS.engagement} {...lineDefaults} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Subscriber Velocity" subtitle={`Avg: ${avgSubsVelocity} subs/1K views`}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid {...cartesianGridDefaults} />
                <XAxis dataKey="date" {...xAxisDefaults} />
                <YAxis {...yAxisDefaults} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [v, "Subs per 1K views"]} />
                <Line type="monotone" dataKey="subsVelocity" stroke={SEMANTIC_COLORS.subscribers} {...lineDefaults} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Revenue chart */}
      {totals.revenue > 0 && chartData.length > 1 && (
        <ChartCard title="Daily Estimated Revenue" subtitle={`${fmtMoney(totals.revenue)} total`} subtitleColor="text-green-500">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SEMANTIC_COLORS.revenue} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={SEMANTIC_COLORS.revenue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...cartesianGridDefaults} />
              <XAxis dataKey="date" {...xAxisDefaults} />
              <YAxis {...yAxisDefaults} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [fmtMoney(v), "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke={SEMANTIC_COLORS.revenue} strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Interaction metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          icon={<ThumbsUp className="w-3.5 h-3.5" />}
          iconColor={SEMANTIC_COLORS.likes}
          label="Total Likes"
          value={fmtCount(totals.likes)}
          change={deltas?.likes ?? undefined}
          daysRange={daysRange}
        />
        <KpiCard
          icon={<MessageSquare className="w-3.5 h-3.5" />}
          iconColor={SEMANTIC_COLORS.comments}
          label="Total Comments"
          value={fmtCount(totals.comments)}
          change={deltas?.comments ?? undefined}
          daysRange={daysRange}
        />
        <KpiCard
          icon={<MousePointerClick className="w-3.5 h-3.5" />}
          iconColor={SEMANTIC_COLORS.impressions}
          label="Card Clicks"
          value={fmtCount(totals.cardClicks)}
          change={deltas?.cardClicks ?? undefined}
          daysRange={daysRange}
        />
        <KpiCard
          icon={<ArrowUpRight className="w-3.5 h-3.5" />}
          iconColor={SEMANTIC_COLORS.watchTime}
          label="End Screen Clicks"
          value={fmtCount(totals.endScreenClicks)}
          change={deltas?.endScreenClicks ?? undefined}
          daysRange={daysRange}
        />
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, subtitleColor, children }: {
  title: string;
  subtitle?: string;
  subtitleColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && (
          <span className={`text-xs font-mono font-semibold ${subtitleColor || "text-muted-foreground"}`}>
            {subtitle}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function KpiCard({
  icon, iconColor, label, value, sub, positive, change, daysRange,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  change?: number;
  daysRange?: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4 transition-colors hover:bg-card/80">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span style={{ color: iconColor }}>{icon}</span>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
      </div>
      <p className={`text-lg sm:text-xl font-bold font-mono mt-0.5 ${
        positive === true ? "text-green-500" : positive === false ? "text-red-500" : "text-foreground"
      }`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      {change !== undefined && change !== null && (
        <div className={`flex items-center gap-0.5 mt-1.5 ${change >= 0 ? "text-green-500" : "text-red-500"}`}>
          {change >= 0 ? (
            <ArrowUpRight className="w-3 h-3" />
          ) : (
            <ArrowDownRight className="w-3 h-3" />
          )}
          <span className="text-xs font-medium">
            {change >= 0 ? "+" : ""}{change}%{daysRange ? ` vs prev ${daysRange}d` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
