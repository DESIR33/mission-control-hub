import { useWeeklyRevenue } from "@/hooks/use-weekly-revenue";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { DollarSign, TrendingUp, TrendingDown, Calendar, Film } from "lucide-react";

const fmtMoney = (n: number) => {
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

export function WeeklyRevenueSection() {
  const { data: summary, isLoading } = useWeeklyRevenue();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 animate-pulse">
        <div className="h-5 w-48 bg-muted rounded mb-4" />
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-muted/50 rounded" />)}
        </div>
        <div className="h-48 bg-muted/30 rounded" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <DollarSign className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No weekly revenue data available yet.</p>
      </div>
    );
  }

  const wowPositive = summary.weekOverWeekChange >= 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-green-500" />
        Revenue This Week
      </h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Revenue</span>
          <p className="text-lg font-bold font-mono text-foreground mt-0.5">{fmtMoney(summary.totalThisWeek)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">WoW Change</span>
          <p className={`text-lg font-bold font-mono mt-0.5 flex items-center gap-1 ${wowPositive ? "text-green-500" : "text-red-500"}`}>
            {wowPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {wowPositive ? "+" : ""}{summary.weekOverWeekChange.toFixed(0)}%
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Best Day
          </span>
          <p className="text-lg font-bold font-mono text-foreground mt-0.5">
            {summary.bestDay ? `${summary.bestDay.date} (${fmtMoney(summary.bestDay.revenue)})` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Film className="w-3 h-3" /> Top Video
          </span>
          <p className="text-sm font-semibold text-foreground mt-0.5 truncate">
            {summary.topEarningVideo ? `${summary.topEarningVideo.title.slice(0, 25)}...` : "—"}
          </p>
          {summary.topEarningVideo && (
            <p className="text-xs text-green-500 font-mono">{fmtMoney(summary.topEarningVideo.revenue)}</p>
          )}
        </div>
      </div>

      {/* Stacked bar chart: this week vs last week */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">This Week vs Last Week</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={[
            { period: "Last Week", ad: summary.lastWeekAdRevenue, deal: summary.lastWeekDealRevenue, affiliate: summary.lastWeekAffiliateRevenue },
            { period: "This Week", ad: summary.thisWeekAdRevenue, deal: summary.thisWeekDealRevenue, affiliate: summary.thisWeekAffiliateRevenue },
          ]}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtMoney} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [fmtMoney(v), name]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="ad" name="Ad Revenue" fill="#22c55e" stackId="a" />
            <Bar dataKey="deal" name="Deals" fill="#3b82f6" stackId="a" />
            <Bar dataKey="affiliate" name="Affiliate" fill="#a855f7" stackId="a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Daily revenue chart */}
      {summary.dailyRevenue.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Daily Revenue</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={summary.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtMoney} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtMoney(v), "Revenue"]} />
              <Bar dataKey="ad" name="Ad" fill="#22c55e" stackId="a" />
              <Bar dataKey="deal" name="Deal" fill="#3b82f6" stackId="a" />
              <Bar dataKey="affiliate" name="Affiliate" fill="#a855f7" stackId="a" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
