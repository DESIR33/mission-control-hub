import { useMemo } from "react";
import {
  Eye, Clock, Users, TrendingUp, TrendingDown, ArrowUpRight,
  ArrowDownRight, MousePointerClick, Share2, ThumbsUp, MessageSquare,
  Tv, Zap,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, subDays } from "date-fns";
import type { ChannelAnalytics } from "@/hooks/use-youtube-analytics-api";

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const fmtDuration = (seconds: number) => {
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.round(seconds)}s`;
};

const fmtMoney = (n: number) => {
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

/** Compute percentage change between two numbers. Returns null if previous is 0. */
const pctChange = (current: number, previous: number): number | null => {
  if (previous === 0) return current > 0 ? 100 : null;
  return +((current - previous) / Math.abs(previous) * 100).toFixed(1);
};

interface Props {
  data: ChannelAnalytics[];
  daysRange: number;
  currentSubscribers?: number;
}

export function ChannelOverview({ data, daysRange, currentSubscribers }: Props) {
  // Current period: last `daysRange` days
  const filtered = useMemo(() => {
    const cutoff = subDays(new Date(), daysRange);
    return data
      .filter((d) => new Date(d.date) >= cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data, daysRange]);

  // Previous period: the `daysRange` days before the current period
  const prevFiltered = useMemo(() => {
    const currentCutoff = subDays(new Date(), daysRange);
    const prevCutoff = subDays(new Date(), daysRange * 2);
    return data
      .filter((d) => {
        const dt = new Date(d.date);
        return dt >= prevCutoff && dt < currentCutoff;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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

  // Period-over-period deltas
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
    const withImpressions = filtered.filter((d) => d.impressions > 0);
    if (withImpressions.length === 0) return 0;
    return +(
      withImpressions.reduce((sum, d) => sum + d.impressions_ctr, 0) /
      withImpressions.length
    ).toFixed(2);
  }, [filtered]);

  const avgDuration = useMemo(() => {
    if (filtered.length === 0) return 0;
    return Math.round(
      filtered.reduce((sum, d) => sum + d.average_view_duration_seconds, 0) /
        filtered.length
    );
  }, [filtered]);

  const chartData = useMemo(
    () =>
      filtered.map((d) => ({
        date: format(new Date(d.date), "MMM d"),
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

  // Average subscriber velocity for the period
  const avgSubsVelocity = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, d) => acc + d.subsVelocity, 0);
    return +(sum / chartData.length).toFixed(2);
  }, [chartData]);

  if (!totals || filtered.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
        <Tv className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No channel analytics data yet. Sync your YouTube Analytics to see detailed metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          icon={<Eye className="w-3.5 h-3.5 text-blue-500" />}
          label="Views"
          value={fmtCount(totals.views)}
          sub={`${daysRange}d total`}
          change={deltas?.views ?? undefined}
          daysRange={daysRange}
        />
        <KpiCard
          icon={<Clock className="w-3.5 h-3.5 text-purple-500" />}
          label="Watch Time"
          value={totals.watchTime >= 60 ? `${Math.round(totals.watchTime / 60)}h` : `${totals.watchTime}m`}
          sub="estimated"
          change={deltas?.watchTime ?? undefined}
          daysRange={daysRange}
        />
        <KpiCard
          icon={<Users className="w-3.5 h-3.5 text-green-500" />}
          label="Net Subscribers"
          value={`${totals.netSubs >= 0 ? "+" : ""}${fmtCount(totals.netSubs)}`}
          sub={`+${fmtCount(totals.subsGained)} / -${fmtCount(totals.subsLost)}`}
          positive={totals.netSubs >= 0}
          change={deltas?.netSubs ?? undefined}
          daysRange={daysRange}
        />
        <KpiCard
          icon={<MousePointerClick className="w-3.5 h-3.5 text-orange-500" />}
          label="Impressions"
          value={fmtCount(totals.impressions)}
          sub={`${avgCtr}% CTR`}
          change={deltas?.impressions ?? undefined}
          daysRange={daysRange}
        />
        <KpiCard
          icon={<Zap className="w-3.5 h-3.5 text-yellow-500" />}
          label="Avg Duration"
          value={fmtDuration(avgDuration)}
          sub="per view"
        />
        <KpiCard
          icon={<Share2 className="w-3.5 h-3.5 text-cyan-500" />}
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
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Daily Views</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtCount} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toLocaleString(), "Views"]} />
                <Area type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} fill="url(#viewsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Watch Time (hours/day)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="watchGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}h`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}h`, "Watch Time"]} />
                <Area type="monotone" dataKey="watchTime" stroke="#8b5cf6" strokeWidth={2} fill="url(#watchGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Subscribers + CTR + Engagement Rate Chart */}
      {chartData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Daily Net Subscribers</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v >= 0 ? `+${v}` : v, "Net Subs"]} />
                <Bar
                  dataKey="subs"
                  radius={[3, 3, 0, 0]}
                  fill="hsl(var(--primary))"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Impressions CTR %</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "CTR"]} />
                <Line type="monotone" dataKey="ctr" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Feature 14: Engagement Rate Trend Chart */}
      {chartData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Engagement Rate %</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "Engagement Rate"]} />
                <Line type="monotone" dataKey="engagementRate" stroke="#06b6d4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Feature 15: Subscriber Velocity Chart */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Subscriber Velocity</h3>
              <span className="text-[10px] text-muted-foreground">
                Avg: {avgSubsVelocity} subs/1K views
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, "Subs per 1K views"]} />
                <Line type="monotone" dataKey="subsVelocity" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Revenue chart (only show if there's revenue data) */}
      {totals.revenue > 0 && chartData.length > 1 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Daily Estimated Revenue</h3>
            <span className="text-sm font-mono font-semibold text-green-500">{fmtMoney(totals.revenue)} total</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtMoney(v), "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Interaction metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          icon={<ThumbsUp className="w-3.5 h-3.5 text-blue-500" />}
          label="Total Likes"
          value={fmtCount(totals.likes)}
          change={deltas?.likes ?? undefined}
          daysRange={daysRange}
        />
        <KpiCard
          icon={<MessageSquare className="w-3.5 h-3.5 text-green-500" />}
          label="Total Comments"
          value={fmtCount(totals.comments)}
          change={deltas?.comments ?? undefined}
          daysRange={daysRange}
        />
        <KpiCard
          icon={<MousePointerClick className="w-3.5 h-3.5 text-orange-500" />}
          label="Card Clicks"
          value={fmtCount(totals.cardClicks)}
          change={deltas?.cardClicks ?? undefined}
          daysRange={daysRange}
        />
        <KpiCard
          icon={<ArrowUpRight className="w-3.5 h-3.5 text-purple-500" />}
          label="End Screen Clicks"
          value={fmtCount(totals.endScreenClicks)}
          change={deltas?.endScreenClicks ?? undefined}
          daysRange={daysRange}
        />
      </div>
    </div>
  );
}

function KpiCard({
  icon, label, value, sub, positive, change, daysRange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  change?: number;
  daysRange?: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-lg font-bold font-mono mt-0.5 ${
        positive === true ? "text-green-500" : positive === false ? "text-red-500" : "text-foreground"
      }`}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      {change !== undefined && change !== null && (
        <div className={`flex items-center gap-0.5 mt-1 ${change >= 0 ? "text-green-500" : "text-red-500"}`}>
          {change >= 0 ? (
            <ArrowUpRight className="w-3 h-3" />
          ) : (
            <ArrowDownRight className="w-3 h-3" />
          )}
          <span className="text-[10px] font-medium">
            {change >= 0 ? "+" : ""}{change}%{daysRange ? ` vs prev ${daysRange}d` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
