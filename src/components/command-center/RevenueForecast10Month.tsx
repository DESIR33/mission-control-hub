import { useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowUpRight,
  Calculator,
  Lightbulb,
  BarChart3,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevenueForecast } from "@/hooks/use-revenue-forecast";
import { useUnifiedRevenue } from "@/hooks/use-unified-revenue";
import { addMonths, format } from "date-fns";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

const fmtMoney = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

const PIE_COLORS = ["#3b82f6", "#a855f7", "#22c55e"];

interface ProjectionPoint {
  month: string;
  adSense: number;
  sponsors: number;
  affiliates: number;
  total: number;
}

export function RevenueForecast10Month() {
  const { data: forecast, isLoading: forecastLoading } = useRevenueForecast();
  const { data: unified, isLoading: unifiedLoading } = useUnifiedRevenue();
  const [monthlyExpenses, setMonthlyExpenses] = useState<string>("2000");

  const isLoading = forecastLoading || unifiedLoading;

  // Build 10-month projection aligned with 21K -> 50K subscriber growth plan
  const projection = useMemo((): ProjectionPoint[] => {
    if (!unified || !forecast) return [];

    const recentMonths = unified.monthly.slice(-3);
    const avgAdSense =
      recentMonths.length > 0
        ? recentMonths.reduce((s, m) => s + m.adSense, 0) / recentMonths.length
        : 0;
    const avgSponsors =
      recentMonths.length > 0
        ? recentMonths.reduce((s, m) => s + m.sponsors, 0) / recentMonths.length
        : 0;
    const avgAffiliates =
      recentMonths.length > 0
        ? recentMonths.reduce((s, m) => s + m.affiliates, 0) / recentMonths.length
        : 0;

    // Growth rates — AdSense scales with subscriber growth (21K -> 50K over ~10 months = ~9% monthly)
    const subGrowthRate = 0.09;
    // Sponsors grow faster with audience size (deal pipeline)
    const sponsorGrowthRate = 0.12;
    // Affiliates grow moderately
    const affiliateGrowthRate = 0.06;

    const points: ProjectionPoint[] = [];
    for (let i = 0; i < 10; i++) {
      const monthDate = addMonths(new Date(), i + 1);
      const monthLabel = format(monthDate, "MMM yy");

      const adSense = Math.round(avgAdSense * Math.pow(1 + subGrowthRate, i + 1));
      const sponsors = Math.round(avgSponsors * Math.pow(1 + sponsorGrowthRate, i + 1));
      const affiliates = Math.round(avgAffiliates * Math.pow(1 + affiliateGrowthRate, i + 1));

      points.push({
        month: monthLabel,
        adSense,
        sponsors,
        affiliates,
        total: adSense + sponsors + affiliates,
      });
    }
    return points;
  }, [unified, forecast]);

  // Revenue source pie data
  const pieData = useMemo(() => {
    if (!unified) return [];
    return [
      { name: "AdSense", value: unified.adSenseTotal },
      { name: "Sponsors", value: unified.sponsorTotal },
      { name: "Affiliates", value: unified.affiliateTotal },
    ].filter((d) => d.value > 0);
  }, [unified]);

  // Breakeven calculation
  const breakeven = useMemo(() => {
    const expenses = parseFloat(monthlyExpenses) || 0;
    if (!forecast || forecast.avgRpm <= 0 || expenses <= 0) return null;

    // Views needed to cover expenses: expenses / (RPM / 1000)
    const viewsNeeded = (expenses / forecast.avgRpm) * 1000;
    // Assume avg 5K views per video (from recent data)
    const avgViewsPerVideo = unified?.revenuePerVideo
      ? 5000
      : 5000;
    const videosNeeded = Math.ceil(viewsNeeded / avgViewsPerVideo);

    return { viewsNeeded: Math.round(viewsNeeded), videosNeeded, expenses };
  }, [monthlyExpenses, forecast, unified]);

  // Revenue per 1K subscribers
  const revPer1KSubs = useMemo(() => {
    if (!unified || unified.revenuePerSub <= 0) return 0;
    return Math.round(unified.revenuePerSub * 1000 * 100) / 100;
  }, [unified]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            10-Month Revenue Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!forecast || !unified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            10-Month Revenue Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No revenue data available for forecasting.</p>
            <p className="text-xs mt-1">
              Connect your YouTube channel and track deals to see projections.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          10-Month Revenue Forecast
          <Badge
            variant="outline"
            className="ml-auto bg-blue-500/15 text-blue-400 border-blue-500/30 text-xs"
          >
            21K &rarr; 50K Plan
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-green-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Monthly Rev
              </p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">
              {fmtMoney(forecast.currentMonthlyRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">current</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Projected Annual
              </p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">
              {fmtMoney(unified.projectedAnnual)}
            </p>
            <p className="text-xs text-muted-foreground">at current pace</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className="w-3.5 h-3.5 text-purple-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                RPM
              </p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">
              ${forecast.avgRpm.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">avg per 1K views</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              {unified.momGrowth >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                MoM Growth
              </p>
            </div>
            <p
              className={`text-lg font-bold font-mono ${
                unified.momGrowth >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {unified.momGrowth >= 0 ? "+" : ""}
              {unified.momGrowth}%
            </p>
          </div>
        </div>

        {/* Revenue per 1K Subscribers */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-green-500" />
                Revenue per 1K Subscribers
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total revenue earned per 1,000 subscribers (lifetime)
              </p>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">
              {fmtMoney(revPer1KSubs)}
            </p>
          </div>
        </div>

        {/* 10-Month Projection Chart */}
        {projection.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              10-Month Revenue Projection (Stacked by Source)
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={projection}>
                <defs>
                  <linearGradient id="grad10mAdSense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad10mSponsors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad10mAffiliates" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, name: string) => [fmtMoney(v), name]}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="adSense"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="url(#grad10mAdSense)"
                  name="AdSense"
                />
                <Area
                  type="monotone"
                  dataKey="sponsors"
                  stackId="1"
                  stroke="#a855f7"
                  fill="url(#grad10mSponsors)"
                  name="Sponsors"
                />
                <Area
                  type="monotone"
                  dataKey="affiliates"
                  stackId="1"
                  stroke="#22c55e"
                  fill="url(#grad10mAffiliates)"
                  name="Affiliates"
                />
              </AreaChart>
            </ResponsiveContainer>
            {projection.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Month 10 projected total: {fmtMoney(projection[projection.length - 1].total)}/mo
              </p>
            )}
          </div>
        )}

        {/* Revenue Source Pie Chart */}
        {pieData.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Revenue Source Breakdown
            </h3>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => fmtMoney(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pieData.map((d, idx) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span className="text-xs text-foreground flex-1">{d.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {fmtMoney(d.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Breakeven Calculator */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-yellow-500" />
            Breakeven Calculator
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Label htmlFor="monthly-expenses" className="text-xs text-muted-foreground whitespace-nowrap">
                Monthly Expenses ($)
              </Label>
              <Input
                id="monthly-expenses"
                type="number"
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(e.target.value)}
                className="w-32 h-8 text-sm font-mono"
                min={0}
              />
            </div>
            {breakeven && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Views Needed / Month
                  </p>
                  <p className="text-lg font-bold font-mono text-foreground">
                    {breakeven.viewsNeeded.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    at ${forecast.avgRpm.toFixed(2)} RPM
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Videos Needed / Month
                  </p>
                  <p className="text-lg font-bold font-mono text-foreground">
                    {breakeven.videosNeeded}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    at ~5K views/video avg
                  </p>
                </div>
              </div>
            )}
            {!breakeven && (
              <p className="text-xs text-muted-foreground">
                Enter your monthly expenses to see how many videos you need to break even.
              </p>
            )}
          </div>
        </div>

        {/* Insights */}
        {forecast.insights.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
              Forecast Insights
            </h3>
            <ul className="space-y-1">
              {forecast.insights.map((insight, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground flex items-start gap-2"
                >
                  <ArrowUpRight className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
