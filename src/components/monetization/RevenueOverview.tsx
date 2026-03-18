import {
  DollarSign, TrendingUp, BarChart3, Users, Film,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useUnifiedRevenue } from "@/hooks/use-unified-revenue";
import {
  chartTooltipStyle, xAxisDefaults, yAxisDefaults, cartesianGridDefaults, pieDefaults, lineDefaults,
} from "@/lib/chart-theme";

const COLORS = { sponsors: "hsl(var(--chart-1))", affiliates: "hsl(var(--chart-2))", adSense: "hsl(var(--chart-3))" };

const fmtDollar = (n: number) => `$${n.toLocaleString()}`;

export function RevenueOverview() {
  const { data: revenue, isLoading } = useUnifiedRevenue();

  if (isLoading) {
    return <div className="rounded-xl border border-border bg-card p-6 animate-pulse h-96" />;
  }

  if (!revenue) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
        <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No revenue data available yet.</p>
      </div>
    );
  }

  const pieData = [
    { name: "Sponsors", value: revenue.sponsorTotal },
    { name: "Affiliates", value: revenue.affiliateTotal },
    { name: "AdSense", value: revenue.adSenseTotal },
  ].filter((d) => d.value > 0);

  const pieColors = [COLORS.sponsors, COLORS.affiliates, COLORS.adSense];

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Revenue</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{fmtDollar(revenue.totalRevenue)}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Rev/1K Subs</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">
            {fmtDollar(revenue.revenuePerThousandSubs)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Film className="w-3.5 h-3.5 text-purple-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Rev/Video</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{fmtDollar(revenue.revenuePerVideo)}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className={`w-3.5 h-3.5 ${revenue.momGrowth >= 0 ? "text-green-500" : "text-red-500"}`} />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">MoM Growth</p>
          </div>
          <p className={`text-lg font-bold font-mono ${revenue.momGrowth >= 0 ? "text-green-400" : "text-red-400"}`}>
            {revenue.momGrowth >= 0 ? "+" : ""}{revenue.momGrowth}%
          </p>
        </div>
      </div>

      {/* Stacked Area Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Revenue by Source</h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={revenue.monthly} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid {...cartesianGridDefaults} />
            <XAxis {...xAxisDefaults} dataKey="month" />
            <YAxis {...yAxisDefaults} tickFormatter={(v) => `$${v}`} />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => fmtDollar(v)} />
            <Area type="monotone" dataKey="sponsors" stackId="1" stroke={COLORS.sponsors} fill={COLORS.sponsors} fillOpacity={0.6} name="Sponsors" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }} />
            <Area type="monotone" dataKey="affiliates" stackId="1" stroke={COLORS.affiliates} fill={COLORS.affiliates} fillOpacity={0.6} name="Affiliates" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }} />
            <Area type="monotone" dataKey="adSense" stackId="1" stroke={COLORS.adSense} fill={COLORS.adSense} fillOpacity={0.6} name="AdSense" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown + Projected */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Pie Chart */}
        {pieData.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Revenue Breakdown</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  {...pieDefaults}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={pieColors[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => fmtDollar(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Projected Annual */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Revenue Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.sponsors }} />
                <span className="text-xs text-foreground">Sponsors</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">{fmtDollar(revenue.sponsorTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.affiliates }} />
                <span className="text-xs text-foreground">Affiliates</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">{fmtDollar(revenue.affiliateTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.adSense }} />
                <span className="text-xs text-foreground">AdSense</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">{fmtDollar(revenue.adSenseTotal)}</span>
            </div>

            <div className="border-t border-border pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Projected Annual</span>
                <span className="text-sm font-bold font-mono text-foreground">{fmtDollar(revenue.projectedAnnual)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Based on last 3 months average</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
