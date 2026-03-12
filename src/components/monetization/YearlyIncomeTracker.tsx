import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";
import { DollarSign, TrendingUp, TrendingDown, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useUnifiedRevenue } from "@/hooks/use-unified-revenue";
import {
  chartTooltipStyle, xAxisDefaults, yAxisDefaults, cartesianGridDefaults,
  barDefaults, lineDefaults, fmtMoney, pctChange,
} from "@/lib/chart-theme";

const fmtDollar = (n: number) => `$${n.toLocaleString()}`;

export function YearlyIncomeTracker() {
  const { data: revenue, isLoading } = useUnifiedRevenue();

  const analysis = useMemo(() => {
    if (!revenue?.monthly) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // monthly array has 12 entries: [11 months ago ... this month]
    // Map each entry to its actual year/month
    const enriched = revenue.monthly.map((m, i) => {
      const d = new Date(currentYear, currentMonth - (11 - i), 1);
      return { ...m, year: d.getFullYear(), monthIndex: d.getMonth() };
    });

    // YTD = all months in currentYear up to and including currentMonth
    const ytdMonths = enriched.filter((m) => m.year === currentYear);
    const ytdIncome = ytdMonths.reduce((s, m) => s + m.total, 0);

    // Same period last year for YoY
    const prevYearMonths = enriched.filter(
      (m) => m.year === currentYear - 1 && m.monthIndex <= currentMonth
    );
    const prevYtdIncome = prevYearMonths.reduce((s, m) => s + m.total, 0);
    const yoyChange = pctChange(ytdIncome, prevYtdIncome);

    // Monthly avg
    const monthsElapsed = currentMonth + 1;
    const monthlyAvg = ytdIncome / monthsElapsed;

    // Projected annual
    const projectedAnnual = monthlyAvg * 12;

    // Best/worst month this year
    const best = ytdMonths.length > 0
      ? ytdMonths.reduce((a, b) => (a.total > b.total ? a : b))
      : null;
    const worst = ytdMonths.length > 0
      ? ytdMonths.reduce((a, b) => (a.total < b.total ? a : b))
      : null;

    // Monthly trend data for bar chart
    const monthlyTrend = ytdMonths.map((m) => ({
      month: m.month,
      sponsors: m.sponsors,
      affiliates: m.affiliates,
      adSense: m.adSense,
      total: m.total,
    }));

    // YoY comparison data (pair months from this year vs last year)
    const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const yoyData = Array.from({ length: monthsElapsed }, (_, i) => {
      const thisYearMonth = ytdMonths.find((m) => m.monthIndex === i);
      const lastYearMonth = prevYearMonths.find((m) => m.monthIndex === i);
      return {
        month: MONTH_NAMES[i],
        [String(currentYear)]: thisYearMonth?.total || 0,
        [String(currentYear - 1)]: lastYearMonth?.total || 0,
      };
    });

    return {
      ytdIncome,
      prevYtdIncome,
      yoyChange,
      monthlyAvg,
      projectedAnnual,
      best,
      worst,
      monthlyTrend,
      yoyData,
      currentYear,
      prevYear: currentYear - 1,
    };
  }, [revenue]);

  if (isLoading) {
    return <div className="rounded-xl border border-border bg-card p-6 animate-pulse h-96" />;
  }

  if (!analysis || analysis.ytdIncome === 0 && analysis.prevYtdIncome === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No income data available yet. Add deals, affiliates, or AdSense data to see yearly analytics.</p>
      </div>
    );
  }

  const { ytdIncome, yoyChange, monthlyAvg, projectedAnnual, best, worst, monthlyTrend, yoyData, currentYear, prevYear, prevYtdIncome } = analysis;

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          icon={<DollarSign className="w-3.5 h-3.5 text-green-500" />}
          label="YTD Income"
          value={fmtDollar(Math.round(ytdIncome))}
        />
        <KpiCard
          icon={
            yoyChange !== null && yoyChange >= 0
              ? <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
              : <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
          }
          label="YoY Change"
          value={yoyChange !== null ? `${yoyChange >= 0 ? "+" : ""}${yoyChange}%` : "N/A"}
          valueColor={yoyChange !== null ? (yoyChange >= 0 ? "text-green-400" : "text-red-400") : undefined}
          sub={`vs ${fmtDollar(Math.round(prevYtdIncome))} last year`}
        />
        <KpiCard
          icon={<TrendingUp className="w-3.5 h-3.5 text-blue-500" />}
          label="Monthly Avg"
          value={fmtDollar(Math.round(monthlyAvg))}
        />
        <KpiCard
          icon={<Calendar className="w-3.5 h-3.5 text-purple-500" />}
          label="Projected Annual"
          value={fmtDollar(Math.round(projectedAnnual))}
        />
      </div>

      {/* Monthly Trend - Stacked Bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-xl border border-border bg-card p-4"
      >
        <h3 className="text-sm font-semibold text-foreground mb-3">
          {currentYear} Monthly Income
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthlyTrend} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid {...cartesianGridDefaults} />
            <XAxis {...xAxisDefaults} dataKey="month" />
            <YAxis {...yAxisDefaults} tickFormatter={(v) => fmtMoney(v)} />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => fmtDollar(v)} />
            <Bar dataKey="sponsors" stackId="1" fill="hsl(var(--chart-1))" name="Sponsors" {...barDefaults} />
            <Bar dataKey="affiliates" stackId="1" fill="hsl(var(--chart-2))" name="Affiliates" {...barDefaults} />
            <Bar dataKey="adSense" stackId="1" fill="hsl(var(--chart-3))" name="AdSense" {...barDefaults} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* YoY Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-xl border border-border bg-card p-4"
      >
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Year-over-Year Comparison
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={yoyData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid {...cartesianGridDefaults} />
            <XAxis {...xAxisDefaults} dataKey="month" />
            <YAxis {...yAxisDefaults} tickFormatter={(v) => fmtMoney(v)} />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => fmtDollar(v)} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              iconType="circle"
              iconSize={8}
            />
            <Line
              type="monotone"
              dataKey={String(currentYear)}
              stroke="hsl(var(--chart-1))"
              name={String(currentYear)}
              {...lineDefaults}
            />
            <Line
              type="monotone"
              dataKey={String(prevYear)}
              stroke="hsl(var(--muted-foreground))"
              name={String(prevYear)}
              strokeDasharray="6 3"
              {...lineDefaults}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Best / Worst Month */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {best && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <h3 className="text-sm font-semibold text-foreground">Best Month</h3>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{fmtDollar(Math.round(best.total))}</p>
            <p className="text-xs text-muted-foreground mt-1">{best.month}</p>
            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
              <span>Sponsors: {fmtDollar(best.sponsors)}</span>
              <span>Affiliates: {fmtDollar(best.affiliates)}</span>
              <span>AdSense: {fmtDollar(best.adSense)}</span>
            </div>
          </motion.div>
        )}
        {worst && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-semibold text-foreground">Slowest Month</h3>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{fmtDollar(Math.round(worst.total))}</p>
            <p className="text-xs text-muted-foreground mt-1">{worst.month}</p>
            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
              <span>Sponsors: {fmtDollar(worst.sponsors)}</span>
              <span>Affiliates: {fmtDollar(worst.affiliates)}</span>
              <span>AdSense: {fmtDollar(worst.adSense)}</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  icon, label, value, valueColor, sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-border bg-card p-3"
    >
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-lg font-bold font-mono ${valueColor || "text-foreground"}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </motion.div>
  );
}
