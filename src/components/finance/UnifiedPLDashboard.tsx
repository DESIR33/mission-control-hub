import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, TrendingUp, TrendingDown, DollarSign, Receipt, PiggyBank, ArrowUpDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinancialIntelligence, type PLMonth } from "@/hooks/use-financial-intelligence";
import { generateProfitLossPdf } from "@/lib/pdf-profit-loss";
import { chartTooltipStyle, xAxisDefaults, yAxisDefaults, cartesianGridDefaults, barDefaults } from "@/lib/chart-theme";

const fmtMoney = (v: number) => `$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function UnifiedPLDashboard() {
  const [months, setMonths] = useState(12);
  const { plData, isLoading } = useFinancialIntelligence(months);

  const totals = useMemo(() => {
    const totalIncome = plData.reduce((s, m) => s + m.income, 0);
    const totalExpenses = plData.reduce((s, m) => s + m.expenses, 0);
    const totalProfit = totalIncome - totalExpenses;
    const avgMargin = plData.length > 0 ? plData.reduce((s, m) => s + m.margin, 0) / plData.length : 0;
    return { totalIncome, totalExpenses, totalProfit, avgMargin };
  }, [plData]);

  const lastMonth = plData[plData.length - 1];
  const prevMonth = plData[plData.length - 2];
  const profitChange = prevMonth && prevMonth.netProfit !== 0
    ? ((lastMonth?.netProfit - prevMonth.netProfit) / Math.abs(prevMonth.netProfit)) * 100
    : 0;

  const cumulativeData = useMemo(() => {
    let cumProfit = 0;
    return plData.map((m) => {
      cumProfit += m.netProfit;
      return { month: m.month, cumulative: Math.round(cumProfit) };
    });
  }, [plData]);

  const handleExportPdf = () => {
    generateProfitLossPdf({
      rows: plData.map((m) => ({
        month: m.month, income: m.income, expenses: m.expenses, profit: m.netProfit, margin: m.margin,
      })),
      totals,
      period: `Last ${months} months`,
    });
  };

  const handleExportCsv = () => {
    const headers = "Month,Sponsors,Affiliates,AdSense,Products,Total Income,Recurring Expenses,Discretionary,Total Expenses,Net Profit,Margin %";
    const rows = plData.map((m) =>
      [m.month, m.sponsorIncome, m.affiliateIncome, m.adSenseIncome, m.productIncome, m.income, m.recurringExpenses.toFixed(2), m.discretionaryExpenses.toFixed(2), m.expenses.toFixed(2), m.netProfit.toFixed(2), m.margin.toFixed(1)].join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `p-and-l-${months}mo.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="rounded-xl border border-border bg-card p-6 animate-pulse h-96" />;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
            <SelectItem value="24">Last 24 months</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="w-3.5 h-3.5 mr-1.5" />CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download className="w-3.5 h-3.5 mr-1.5" />PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Revenue", value: fmtMoney(totals.totalIncome), icon: DollarSign, color: "text-green-500" },
          { label: "Total Expenses", value: fmtMoney(totals.totalExpenses), icon: Receipt, color: "text-red-500" },
          {
            label: "Net Profit",
            value: `${totals.totalProfit < 0 ? "-" : ""}${fmtMoney(totals.totalProfit)}`,
            icon: PiggyBank,
            color: totals.totalProfit >= 0 ? "text-green-500" : "text-red-500",
            sub: profitChange !== 0 ? `${profitChange > 0 ? "+" : ""}${profitChange.toFixed(0)}% MoM` : undefined,
            subColor: profitChange >= 0 ? "text-green-400" : "text-red-400",
          },
          { label: "Avg Margin", value: `${totals.avgMargin.toFixed(1)}%`, icon: ArrowUpDown, color: totals.avgMargin >= 30 ? "text-green-500" : "text-amber-500" },
        ].map((kpi) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
            </div>
            <p className={`text-lg font-bold font-mono ${kpi.color}`}>{kpi.value}</p>
            {"sub" in kpi && kpi.sub && (
              <p className={`text-xs flex items-center gap-1 mt-0.5 ${kpi.subColor}`}>
                {profitChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {kpi.sub}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Income vs Expenses Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Income vs Expenses</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={plData} barGap={4}>
            <CartesianGrid {...cartesianGridDefaults} />
            <XAxis {...xAxisDefaults} dataKey="month" />
            <YAxis {...yAxisDefaults} tickFormatter={(v) => `$${v}`} />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [`$${value.toFixed(0)}`, undefined]} />
            <Legend />
            <Bar dataKey="income" name="Income" fill="hsl(var(--chart-2))" {...barDefaults} />
            <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--destructive))" {...barDefaults} opacity={0.7} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue Breakdown + Cumulative Profit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Revenue by Source</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={plData}>
              <CartesianGrid {...cartesianGridDefaults} />
              <XAxis {...xAxisDefaults} dataKey="month" />
              <YAxis {...yAxisDefaults} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend />
              <Bar dataKey="sponsorIncome" name="Sponsors" stackId="a" fill="hsl(var(--chart-1))" />
              <Bar dataKey="affiliateIncome" name="Affiliates" stackId="a" fill="hsl(var(--chart-3))" />
              <Bar dataKey="adSenseIncome" name="AdSense" stackId="a" fill="hsl(var(--chart-4))" />
              <Bar dataKey="productIncome" name="Products" stackId="a" fill="hsl(var(--chart-5))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Cumulative Profit</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={cumulativeData}>
              <CartesianGrid {...cartesianGridDefaults} />
              <XAxis {...xAxisDefaults} dataKey="month" />
              <YAxis {...yAxisDefaults} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2.5} name="Cumulative Profit" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Monthly Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Month</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Sponsors</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Affiliates</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">AdSense</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Products</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider font-semibold">Income</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Expenses</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider font-semibold">Net</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Margin</th>
              </tr>
            </thead>
            <tbody>
              {plData.map((m) => (
                <tr key={m.monthKey} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{m.month}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-green-400">{fmtMoney(m.sponsorIncome)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-green-400">{fmtMoney(m.affiliateIncome)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-green-400">{fmtMoney(m.adSenseIncome)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-green-400">{fmtMoney(m.productIncome)}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-green-400">{fmtMoney(m.income)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-red-400">{fmtMoney(m.expenses)}</td>
                  <td className={`px-4 py-2.5 text-right font-mono font-semibold ${m.netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {m.netProfit < 0 ? "-" : ""}{fmtMoney(m.netProfit)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{m.margin.toFixed(1)}%</td>
                </tr>
              ))}
              <tr className="border-t-2 border-foreground/30 font-bold bg-muted/30">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right font-mono text-green-400">{fmtMoney(plData.reduce((s, m) => s + m.sponsorIncome, 0))}</td>
                <td className="px-4 py-3 text-right font-mono text-green-400">{fmtMoney(plData.reduce((s, m) => s + m.affiliateIncome, 0))}</td>
                <td className="px-4 py-3 text-right font-mono text-green-400">{fmtMoney(plData.reduce((s, m) => s + m.adSenseIncome, 0))}</td>
                <td className="px-4 py-3 text-right font-mono text-green-400">{fmtMoney(plData.reduce((s, m) => s + m.productIncome, 0))}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-green-400">{fmtMoney(totals.totalIncome)}</td>
                <td className="px-4 py-3 text-right font-mono text-red-400">{fmtMoney(totals.totalExpenses)}</td>
                <td className={`px-4 py-3 text-right font-mono font-semibold ${totals.totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}>{fmtMoney(totals.totalProfit)}</td>
                <td className="px-4 py-3 text-right font-mono">{totals.avgMargin.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
