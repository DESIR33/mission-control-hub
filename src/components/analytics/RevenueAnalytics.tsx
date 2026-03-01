import { useMemo } from "react";
import { DollarSign, TrendingUp, Banknote, BarChart3 } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, subDays } from "date-fns";
import type { ChannelAnalytics } from "@/hooks/use-youtube-analytics-api";
import type { VideoAnalytics } from "@/hooks/use-youtube-analytics-api";

const fmtMoney = (n: number) => {
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

interface Props {
  channelData: ChannelAnalytics[];
  videoData: VideoAnalytics[];
  daysRange: number;
}

export function RevenueAnalytics({ channelData, videoData, daysRange }: Props) {
  const filtered = useMemo(() => {
    const cutoff = subDays(new Date(), daysRange);
    return channelData
      .filter((d) => new Date(d.date) >= cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [channelData, daysRange]);

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

  const avgCpm = useMemo(() => {
    const withCpm = filtered.filter((d) => d.cpm > 0);
    if (withCpm.length === 0) return 0;
    return +(withCpm.reduce((s, d) => s + d.cpm, 0) / withCpm.length).toFixed(2);
  }, [filtered]);

  const avgPlaybackCpm = useMemo(() => {
    const withCpm = filtered.filter((d) => d.playback_based_cpm > 0);
    if (withCpm.length === 0) return 0;
    return +(withCpm.reduce((s, d) => s + d.playback_based_cpm, 0) / withCpm.length).toFixed(2);
  }, [filtered]);

  const rpm = useMemo(() => {
    return totals.views > 0 ? +((totals.revenue / totals.views) * 1000).toFixed(2) : 0;
  }, [totals]);

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

  // Top earning videos
  const topEarningVideos = useMemo(
    () =>
      [...videoData]
        .filter((v) => v.estimated_revenue > 0)
        .sort((a, b) => b.estimated_revenue - a.estimated_revenue)
        .slice(0, 10),
    [videoData]
  );

  const hasRevenue = totals.revenue > 0;

  if (!hasRevenue && topEarningVideos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
        <DollarSign className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No revenue data available. Revenue analytics require a monetized YouTube channel with YouTube Analytics API access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <RevenueKpi label="Est. Revenue" value={fmtMoney(totals.revenue)} sub={`${daysRange}d total`} />
        <RevenueKpi label="Ad Revenue" value={fmtMoney(totals.adRevenue)} sub="from ads" />
        <RevenueKpi label="Premium Revenue" value={fmtMoney(totals.redRevenue)} sub="YouTube Premium" />
        <RevenueKpi label="RPM" value={`$${rpm}`} sub="per 1K views" />
        <RevenueKpi label="Avg CPM" value={`$${avgCpm}`} sub="cost per mille" />
        <RevenueKpi label="Monetized Plays" value={fmtCount(totals.monetizedPlaybacks)} sub="ad-served" />
      </div>

      {/* Revenue trend */}
      {dailyChartData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Daily Revenue Breakdown</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyChartData}>
                <defs>
                  <linearGradient id="adRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="premRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => {
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
                <Area type="monotone" dataKey="adRevenue" stroke="#22c55e" strokeWidth={2} fill="url(#adRevGrad)" />
                <Area type="monotone" dataKey="premiumRevenue" stroke="#ef4444" strokeWidth={1.5} fill="url(#premRevGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">CPM Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v}`, "CPM"]} />
                <Line type="monotone" dataKey="cpm" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Earning Videos */}
      {topEarningVideos.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Banknote className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-semibold text-foreground">Top Earning Videos</h3>
          </div>
          <div className="space-y-2">
            {topEarningVideos.map((v, i) => (
              <div key={v.youtube_video_id} className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/20 transition-colors">
                <span className="text-sm font-bold text-muted-foreground font-mono w-6 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{v.title || v.youtube_video_id}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{fmtCount(v.views)} views</span>
                    <span className="text-[10px] text-muted-foreground">{v.impressions_ctr.toFixed(1)}% CTR</span>
                    <span className="text-[10px] text-muted-foreground">RPM: ${v.views > 0 ? ((v.estimated_revenue / v.views) * 1000).toFixed(2) : "0"}</span>
                  </div>
                </div>
                <span className="text-sm font-mono font-bold text-green-500">{fmtMoney(v.estimated_revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RevenueKpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <DollarSign className="w-3.5 h-3.5 text-green-500" />
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-lg font-bold font-mono text-foreground mt-0.5">{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}
