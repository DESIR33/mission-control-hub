import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Percent, Target, Download,
  ArrowUpRight, ArrowDownRight, Scale,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useUnifiedRevenue } from "@/hooks/use-unified-revenue";
import { useExpenses, useRecurringSubscriptions } from "@/hooks/use-expenses";
import { chartTooltipStyle, xAxisDefaults, yAxisDefaults, cartesianGridDefaults } from "@/lib/chart-theme";
import { exportData, type ExportColumn } from "@/lib/export-utils";
import { generateProfitLossPdf } from "@/lib/pdf-profit-loss";
import { FileText } from "lucide-react";

interface MonthlyPL {
  month: string;
  monthStr: string; // yyyy-MM
  year: number;
  income: number;
  expenses: number;
  profit: number;
  margin: number;
  cumProfit: number;
}

const fmtMoney = (v: number) =>
  v < 0 ? `-$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function ProfitTracker() {
  const [viewYear, setViewYear] = useState<string>("all");
  const { data: revenue } = useUnifiedRevenue(24);
  const { data: expenses = [] } = useExpenses();
  const { data: subs = [] } = useRecurringSubscriptions();

  const plData = useMemo((): MonthlyPL[] => {
    if (!revenue) return [];
    const now = new Date();
    const totalMonths = revenue.monthly.length;
    const currentMonth = now.getMonth();

    const activeSubs = subs.filter((s) => s.status === "active");
    const monthlyRecurring = activeSubs.reduce((sum, s) => {
      const amt = Number(s.amount);
      if (s.billing_cycle === "yearly") return sum + amt / 12;
      if (s.billing_cycle === "quarterly") return sum + amt / 3;
      return sum + amt;
    }, 0);

    let cumProfit = 0;
    return revenue.monthly.map((m, i) => {
      const d = new Date(now.getFullYear(), currentMonth - (totalMonths - 1 - i), 1);
      const monthStart = startOfMonth(d);
      const monthEnd = endOfMonth(d);
      const monthStr = format(d, "yyyy-MM");

      // Sum expenses for this month
      const monthExpenses = expenses.filter((e) => {
        const ed = new Date(e.expense_date);
        return ed >= monthStart && ed <= monthEnd;
      });
      const expenseTotal = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);

      // Add recurring subscription cost if in future or current month range
      const totalExpenses = expenseTotal > 0 ? expenseTotal : monthlyRecurring;

      const income = m.total;
      const profit = income - totalExpenses;
      cumProfit += profit;
      const margin = income > 0 ? (profit / income) * 100 : 0;

      return {
        month: m.month,
        monthStr,
        year: d.getFullYear(),
        income: Math.round(income * 100) / 100,
        expenses: Math.round(totalExpenses * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        margin: Math.round(margin * 10) / 10,
        cumProfit: Math.round(cumProfit * 100) / 100,
      };
    });
  }, [revenue, expenses, subs]);

  const years = useMemo(() => {
    const s = new Set(plData.map((d) => d.year));
    return Array.from(s).sort();
  }, [plData]);

  const filtered = useMemo(
    () => (viewYear === "all" ? plData : plData.filter((d) => String(d.year) === viewYear)),
    [plData, viewYear],
  );

  // KPIs
  const totals = useMemo(() => {
    const totalIncome = filtered.reduce((s, d) => s + d.income, 0);
    const totalExpenses = filtered.reduce((s, d) => s + d.expenses, 0);
    const totalProfit = totalIncome - totalExpenses;
    const avgMargin = totalIncome > 0 ? (totalProfit / totalIncome) * 100 : 0;

    // Break-even month: first month where cumProfit >= 0
    const breakEvenMonth = filtered.find((d) => d.cumProfit >= 0);

    // MoM profit trend
    const last = filtered[filtered.length - 1]?.profit || 0;
    const prev = filtered[filtered.length - 2]?.profit || 0;
    const profitTrend = prev !== 0 ? ((last - prev) / Math.abs(prev)) * 100 : 0;

    return { totalIncome, totalExpenses, totalProfit, avgMargin, breakEvenMonth, profitTrend, lastProfit: last };
  }, [filtered]);

  // Export columns
  const exportColumns: ExportColumn<MonthlyPL>[] = [
    { key: "month", label: "Month" },
    { key: "income", label: "Income", getValue: (d) => d.income.toFixed(2) },
    { key: "expenses", label: "Expenses", getValue: (d) => d.expenses.toFixed(2) },
    { key: "profit", label: "Profit", getValue: (d) => d.profit.toFixed(2) },
    { key: "margin", label: "Margin %", getValue: (d) => d.margin.toFixed(1) },
  ];

  const handleExport = (fmt: "csv" | "json") => {
    exportData(filtered, exportColumns, "profit_loss_statement", fmt);
  };

  if (!revenue || plData.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Scale className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading profit & loss data…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header with filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Profit & Loss</h2>
          <p className="text-xs text-muted-foreground">Income minus expenses across all revenue streams</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={viewYear} onValueChange={setViewYear}>
            <SelectTrigger className="w-[120px] bg-secondary border-border h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => handleExport("csv")}>
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => handleExport("json")}>
            <Download className="w-3.5 h-3.5" /> JSON
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="Total Income"
          value={fmtMoney(totals.totalIncome)}
          icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
        />
        <KpiCard
          label="Total Expenses"
          value={fmtMoney(totals.totalExpenses)}
          icon={<ArrowDownRight className="w-4 h-4 text-red-500" />}
        />
        <KpiCard
          label="Net Profit"
          value={fmtMoney(totals.totalProfit)}
          icon={totals.totalProfit >= 0
            ? <TrendingUp className="w-4 h-4 text-emerald-500" />
            : <TrendingDown className="w-4 h-4 text-red-500" />}
          valueClass={totals.totalProfit >= 0 ? "text-emerald-500" : "text-red-500"}
        />
        <KpiCard
          label="Avg Margin"
          value={`${totals.avgMargin.toFixed(1)}%`}
          icon={<Percent className="w-4 h-4 text-blue-500" />}
        />
        <KpiCard
          label="Profit Trend"
          value={`${totals.profitTrend >= 0 ? "+" : ""}${totals.profitTrend.toFixed(0)}%`}
          icon={totals.profitTrend >= 0
            ? <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            : <ArrowDownRight className="w-4 h-4 text-red-500" />}
          valueClass={totals.profitTrend >= 0 ? "text-emerald-500" : "text-red-500"}
        />
        <KpiCard
          label="Break-even"
          value={totals.breakEvenMonth ? totals.breakEvenMonth.month : "N/A"}
          icon={<Target className="w-4 h-4 text-amber-500" />}
        />
      </div>

      {/* P&L Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl border border-border bg-card p-5"
      >
        <h3 className="text-sm font-semibold mb-4">Monthly Income vs Expenses</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filtered} barGap={2}>
              <CartesianGrid {...cartesianGridDefaults} />
              <XAxis dataKey="month" {...xAxisDefaults} />
              <YAxis {...yAxisDefaults} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(value: number, name: string) => [fmtMoney(value), name]}
              />
              <Legend />
              <Bar dataKey="income" name="Income" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--chart-5))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Profit Line + Margin Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <h3 className="text-sm font-semibold mb-4">Net Profit Trend</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filtered}>
                <CartesianGrid {...cartesianGridDefaults} />
                <XAxis dataKey="month" {...xAxisDefaults} />
                <YAxis {...yAxisDefaults} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [fmtMoney(v), "Net Profit"]} />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Bar dataKey="profit" name="Net Profit" radius={[3, 3, 0, 0]}>
                  {filtered.map((entry, index) => (
                    <Cell key={index} fill={entry.profit >= 0 ? "hsl(var(--chart-2))" : "hsl(var(--destructive))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <h3 className="text-sm font-semibold mb-4">Profit Margin %</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filtered}>
                <CartesianGrid {...cartesianGridDefaults} />
                <XAxis dataKey="month" {...xAxisDefaults} />
                <YAxis {...yAxisDefaults} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`${v.toFixed(1)}%`, "Margin"]} />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="margin" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Cumulative Profit */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-xl border border-border bg-card p-5"
      >
        <h3 className="text-sm font-semibold mb-4">Cumulative Profit (Break-even Analysis)</h3>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filtered}>
              <CartesianGrid {...cartesianGridDefaults} />
              <XAxis dataKey="month" {...xAxisDefaults} />
              <YAxis {...yAxisDefaults} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [fmtMoney(v), "Cumulative"]} />
              <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: "Break-even", position: "right", fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Line type="monotone" dataKey="cumProfit" stroke="hsl(var(--chart-1))" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* P&L Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold">P&L Statement</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Month</th>
                <th className="text-right py-2.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Income</th>
                <th className="text-right py-2.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Expenses</th>
                <th className="text-right py-2.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Net Profit</th>
                <th className="text-right py-2.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Margin</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.monthStr} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-4 font-medium">{row.month}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-emerald-500">{fmtMoney(row.income)}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-red-500">{fmtMoney(row.expenses)}</td>
                  <td className={`py-2.5 px-4 text-right font-mono font-semibold ${row.profit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {fmtMoney(row.profit)}
                  </td>
                  <td className={`py-2.5 px-4 text-right font-mono ${row.margin >= 0 ? "text-foreground" : "text-red-500"}`}>
                    {row.margin.toFixed(1)}%
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-muted/40 font-semibold">
                <td className="py-2.5 px-4">Total</td>
                <td className="py-2.5 px-4 text-right font-mono text-emerald-500">{fmtMoney(totals.totalIncome)}</td>
                <td className="py-2.5 px-4 text-right font-mono text-red-500">{fmtMoney(totals.totalExpenses)}</td>
                <td className={`py-2.5 px-4 text-right font-mono ${totals.totalProfit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {fmtMoney(totals.totalProfit)}
                </td>
                <td className={`py-2.5 px-4 text-right font-mono ${totals.avgMargin >= 0 ? "text-foreground" : "text-red-500"}`}>
                  {totals.avgMargin.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function KpiCard({ label, value, icon, valueClass }: { label: string; value: string; icon: React.ReactNode; valueClass?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3.5">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      </div>
      <p className={`text-xl font-mono font-bold ${valueClass || "text-foreground"}`}>{value}</p>
    </div>
  );
}
