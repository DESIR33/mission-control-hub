import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Download, Calculator, FileText, CheckCircle2, AlertCircle, DollarSign, Percent } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinancialIntelligence } from "@/hooks/use-financial-intelligence";
import { useExpenses, useExpenseCategories } from "@/hooks/use-expenses";
import { chartTooltipStyle, xAxisDefaults, yAxisDefaults, cartesianGridDefaults, barDefaults } from "@/lib/chart-theme";
import { CartesianGrid } from "recharts";

const fmtMoney = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

export function TaxPrepDashboard() {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const monthsNeeded = useMemo(() => {
    const now = new Date();
    return (now.getFullYear() - selectedYear) * 12 + now.getMonth() + 1;
  }, [selectedYear]);
  const { quarterlyTax, budgetCategories, plData, isLoading } = useFinancialIntelligence(Math.max(monthsNeeded, 12), selectedYear);
  const { data: expenses = [] } = useExpenses();
  const { data: expenseCategories = [] } = useExpenseCategories();

  const filteredQuarterlyTax = quarterlyTax;

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const expenseYear = new Date(e.expense_date || e.created_at).getFullYear();
      return expenseYear === selectedYear;
    });
  }, [expenses, selectedYear]);

  const incomeBySource = useMemo(() => {
    const yearMonths = plData.filter((m) => m.monthKey.startsWith(String(selectedYear)));
    const adSense = yearMonths.reduce((s, m) => s + m.adSenseIncome, 0);
    const affiliates = yearMonths.reduce((s, m) => s + m.affiliateIncome, 0);
    const sponsors = yearMonths.reduce((s, m) => s + m.sponsorIncome, 0);
    const products = yearMonths.reduce((s, m) => s + m.productIncome, 0);
    const total = adSense + affiliates + sponsors + products;
    return { adSense, affiliates, sponsors, products, total };
  }, [plData, selectedYear]);

  const ytdTotals = useMemo(() => {
    const ytdIncome = filteredQuarterlyTax.reduce((s, q) => s + q.income, 0);
    const ytdDeductions = filteredQuarterlyTax.reduce((s, q) => s + q.deductions, 0);
    const ytdTax = filteredQuarterlyTax.reduce((s, q) => s + q.estimatedTax, 0);
    return { ytdIncome, ytdDeductions, ytdTax, taxableIncome: ytdIncome - ytdDeductions };
  }, [filteredQuarterlyTax]);

  const deductionBreakdown = useMemo(() => {
    const deductibleExpenses = filteredExpenses.filter((e) => e.is_tax_deductible);
    const byCategory = new Map<string, number>();
    deductibleExpenses.forEach((e) => {
      const key = e.category_id || "uncategorized";
      byCategory.set(key, (byCategory.get(key) || 0) + Number(e.amount));
    });
    return Array.from(byCategory.entries())
      .map(([id, total]) => {
        const cat = expenseCategories.find((c) => c.id === id);
        return { categoryId: id, name: cat?.name || (id === "uncategorized" ? "Uncategorized" : "Unknown"), total, color: cat?.color || "#94a3b8" };
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses, expenseCategories]);

  const actionItems = useMemo(() => {
    const items: { text: string; type: "warning" | "info" }[] = [];
    const uncategorized = filteredExpenses.filter((e) => !e.category_id && e.is_tax_deductible);
    if (uncategorized.length > 0) items.push({ text: `${uncategorized.length} deductible expenses need categorization`, type: "warning" });
    const noReceipt = filteredExpenses.filter((e) => !e.receipt_url && Number(e.amount) > 75);
    if (noReceipt.length > 0) items.push({ text: `${noReceipt.length} expenses over $75 missing receipts`, type: "warning" });
    const nonDeductible = filteredExpenses.filter((e) => !e.is_tax_deductible);
    if (nonDeductible.length > 5) items.push({ text: `Review ${nonDeductible.length} non-deductible expenses — some may qualify`, type: "info" });
    return items;
  }, [filteredExpenses]);

  const handleExportTaxReport = () => {
    const headers = "Quarter,Gross Income,Deductions,Taxable Income,Estimated Tax,Effective Rate";
    const rows = filteredQuarterlyTax.map((q) =>
      [q.quarterLabel, q.income.toFixed(2), q.deductions.toFixed(2), q.taxableIncome.toFixed(2), q.estimatedTax.toFixed(2), `${q.effectiveRate.toFixed(1)}%`].join(",")
    );
    rows.push([`${selectedYear} Total`, ytdTotals.ytdIncome.toFixed(2), ytdTotals.ytdDeductions.toFixed(2), ytdTotals.taxableIncome.toFixed(2), ytdTotals.ytdTax.toFixed(2), ""].join(","));
    rows.push("", "Deduction Breakdown", "Category,Amount");
    deductionBreakdown.forEach((d) => rows.push(`${d.name},${d.total.toFixed(2)}`));
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tax-report-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="rounded-xl border border-border bg-card p-6 animate-pulse h-96" />;

  return (
    <div className="space-y-5">
      {/* Year selector + Export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Tax Year</span>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportTaxReport}>
          <Download className="w-3.5 h-3.5 mr-1.5" />Export Tax Report
        </Button>
      </div>

      {/* YTD KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: `${selectedYear} Gross Income`, value: fmtMoney(ytdTotals.ytdIncome), icon: DollarSign, color: "text-green-500" },
          { label: `${selectedYear} Deductions`, value: fmtMoney(ytdTotals.ytdDeductions), icon: Percent, color: "text-blue-500" },
          { label: "Taxable Income", value: fmtMoney(ytdTotals.taxableIncome), icon: Calculator, color: "text-foreground" },
          { label: "Estimated Tax Due", value: fmtMoney(ytdTotals.ytdTax), icon: FileText, color: "text-red-500" },
        ].map((kpi) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
            </div>
            <p className={`text-lg font-bold font-mono ${kpi.color}`}>{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Quarterly Breakdown Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-muted-foreground" />
          Quarterly Tax Estimates
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={filteredQuarterlyTax} barGap={4}>
            <CartesianGrid {...cartesianGridDefaults} />
            <XAxis {...xAxisDefaults} dataKey="quarterLabel" />
            <YAxis {...yAxisDefaults} tickFormatter={(v) => `$${v}`} />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`$${v.toFixed(0)}`, undefined]} />
            <Legend />
            <Bar dataKey="income" name="Gross Income" fill="hsl(var(--chart-2))" {...barDefaults} />
            <Bar dataKey="deductions" name="Deductions" fill="hsl(var(--chart-3))" {...barDefaults} />
            <Bar dataKey="estimatedTax" name="Est. Tax" fill="hsl(var(--destructive))" {...barDefaults} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quarterly Table + Deductions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Quarterly Summary
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Quarter</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Income</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Deductions</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Est. Tax</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuarterlyTax.map((q) => (
                  <tr key={q.quarter} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">{q.quarterLabel}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-green-400">{fmtMoney(q.income)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-blue-400">{fmtMoney(q.deductions)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-red-400">{fmtMoney(q.estimatedTax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Deduction Categories</h3>
          {deductionBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No deductible expenses found. Mark expenses as tax-deductible in the Expense Tracker.</p>
          ) : (
            <div className="space-y-2">
              {deductionBreakdown.map((d) => {
                const maxTotal = deductionBreakdown[0]?.total || 1;
                return (
                  <div
                    key={d.name}
                    className="flex items-center gap-3 cursor-pointer rounded-lg px-1 py-1 hover:bg-muted/40 transition-colors"
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (d.categoryId !== "uncategorized") params.set("category", d.categoryId);
                      params.set("year", String(selectedYear));
                      navigate(`/finance/expenses/expenses?${params.toString()}`);
                    }}
                    title={`View ${d.name} expenses for ${selectedYear}`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-sm w-32 truncate">{d.name}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(d.total / maxTotal) * 100}%`, backgroundColor: d.color }} />
                    </div>
                    <span className="text-sm font-mono font-medium w-20 text-right">{fmtMoney(d.total)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action Items */}
      {actionItems.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Tax Preparation Checklist</h3>
          <div className="space-y-2">
            {actionItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30">
                {item.type === "warning" ? (
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                )}
                <span className="text-sm">{item.text}</span>
                <Badge variant="outline" className="ml-auto text-xs">{item.type}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
