import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, TrendingUp, TrendingDown, DollarSign, Receipt, PiggyBank, ArrowUpDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinancialIntelligence, type PLMonth } from "@/hooks/use-financial-intelligence";
import { generateProfitLossPdf } from "@/lib/pdf-profit-loss";

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

  // Cumulative profit chart data
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
        month: m.month,
        income: m.income,
        expenses: m.expenses,
        profit: m.netProfit,
        margin: m.margin,
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

  if (isLoading) return <div className="text-sm text-muted-foreground py-8 text-center">Loading financial data…</div>;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
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
        </div>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Revenue", value: fmtMoney(totals.totalIncome), icon: DollarSign, color: "text-emerald-500" },
          { label: "Total Expenses", value: fmtMoney(totals.totalExpenses), icon: Receipt, color: "text-red-500" },
          {
            label: "Net Profit",
            value: `${totals.totalProfit < 0 ? "-" : ""}${fmtMoney(totals.totalProfit)}`,
            icon: PiggyBank,
            color: totals.totalProfit >= 0 ? "text-emerald-500" : "text-red-500",
            sub: profitChange !== 0 ? `${profitChange > 0 ? "+" : ""}${profitChange.toFixed(0)}% MoM` : undefined,
            subColor: profitChange >= 0 ? "text-emerald-500" : "text-red-500",
          },
          { label: "Avg Margin", value: `${totals.avgMargin.toFixed(1)}%`, icon: ArrowUpDown, color: totals.avgMargin >= 30 ? "text-emerald-500" : "text-amber-500" },
        ].map((kpi) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </div>
            <p className={`text-2xl font-mono font-bold ${kpi.color}`}>{kpi.value}</p>
            {"sub" in kpi && kpi.sub && (
              <p className={`text-xs flex items-center gap-1 mt-1 ${kpi.subColor}`}>
                {profitChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {kpi.sub}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Income vs Expenses Chart */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-medium mb-4">Income vs Expenses</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={plData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(value: number) => [`$${value.toFixed(0)}`, undefined]}
              />
              <Legend />
              <Bar dataKey="income" name="Income" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Breakdown + Cumulative Profit */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium mb-4">Revenue by Source</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={plData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend />
                <Bar dataKey="sponsorIncome" name="Sponsors" stackId="a" fill="hsl(var(--chart-1))" />
                <Bar dataKey="affiliateIncome" name="Affiliates" stackId="a" fill="hsl(var(--chart-3))" />
                <Bar dataKey="adSenseIncome" name="AdSense" stackId="a" fill="hsl(var(--chart-4))" />
                <Bar dataKey="productIncome" name="Products" stackId="a" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium mb-4">Cumulative Profit</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name="Cumulative Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium">Monthly Breakdown</h3>
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
                  <td className="px-4 py-2.5 text-right font-mono text-emerald-500">{fmtMoney(m.sponsorIncome)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-emerald-500">{fmtMoney(m.affiliateIncome)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-emerald-500">{fmtMoney(m.adSenseIncome)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-emerald-500">{fmtMoney(m.productIncome)}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-500">{fmtMoney(m.income)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-red-500">{fmtMoney(m.expenses)}</td>
                  <td className={`px-4 py-2.5 text-right font-mono font-semibold ${m.netProfit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {m.netProfit < 0 ? "-" : ""}{fmtMoney(m.netProfit)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{m.margin.toFixed(1)}%</td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="border-t-2 border-foreground/30 font-bold bg-muted/30">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right font-mono text-emerald-500">{fmtMoney(plData.reduce((s, m) => s + m.sponsorIncome, 0))}</td>
                <td className="px-4 py-3 text-right font-mono text-emerald-500">{fmtMoney(plData.reduce((s, m) => s + m.affiliateIncome, 0))}</td>
                <td className="px-4 py-3 text-right font-mono text-emerald-500">{fmtMoney(plData.reduce((s, m) => s + m.adSenseIncome, 0))}</td>
                <td className="px-4 py-3 text-right font-mono text-emerald-500">{fmtMoney(plData.reduce((s, m) => s + m.productIncome, 0))}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-500">{fmtMoney(totals.totalIncome)}</td>
                <td className="px-4 py-3 text-right font-mono text-red-500">{fmtMoney(totals.totalExpenses)}</td>
                <td className={`px-4 py-3 text-right font-mono font-semibold ${totals.totalProfit >= 0 ? "text-emerald-500" : "text-red-500"}`}>{fmtMoney(totals.totalProfit)}</td>
                <td className="px-4 py-3 text-right font-mono">{totals.avgMargin.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
