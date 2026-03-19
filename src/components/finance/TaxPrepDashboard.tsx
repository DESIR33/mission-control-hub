import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, Calculator, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinancialIntelligence } from "@/hooks/use-financial-intelligence";
import { useExpenses } from "@/hooks/use-expenses";

const fmtMoney = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

export function TaxPrepDashboard() {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const { quarterlyTax, budgetCategories, plData, isLoading } = useFinancialIntelligence(12);
  const { data: expenses = [] } = useExpenses();

  // Filter quarterly tax data by selected year
  const filteredQuarterlyTax = useMemo(() => {
    return quarterlyTax.filter((q) => q.quarterLabel?.includes(String(selectedYear)));
  }, [quarterlyTax, selectedYear]);

  // Filter expenses by selected year
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const expenseYear = new Date(e.expense_date || e.created_at).getFullYear();
      return expenseYear === selectedYear;
    });
  }, [expenses, selectedYear]);

  const ytdTotals = useMemo(() => {
    const ytdIncome = filteredQuarterlyTax.reduce((s, q) => s + q.income, 0);
    const ytdDeductions = filteredQuarterlyTax.reduce((s, q) => s + q.deductions, 0);
    const ytdTax = filteredQuarterlyTax.reduce((s, q) => s + q.estimatedTax, 0);
    return { ytdIncome, ytdDeductions, ytdTax, taxableIncome: ytdIncome - ytdDeductions };
  }, [filteredQuarterlyTax]);

  // Deduction categories
  const deductionBreakdown = useMemo(() => {
    const deductibleExpenses = filteredExpenses.filter((e) => e.is_tax_deductible);
    const byCategory = new Map<string, number>();
    deductibleExpenses.forEach((e) => {
      const key = e.category_id || "uncategorized";
      byCategory.set(key, (byCategory.get(key) || 0) + Number(e.amount));
    });
    return Array.from(byCategory.entries())
      .map(([id, total]) => {
        const cat = budgetCategories.find((c) => c.categoryId === id);
        return {
          name: cat?.name || (id === "uncategorized" ? "Uncategorized" : "Unknown"),
          total,
          color: cat?.color || "#94a3b8",
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses, budgetCategories]);

  // Items needing attention
  const actionItems = useMemo(() => {
    const items: { text: string; type: "warning" | "info" }[] = [];
    const uncategorized = filteredExpenses.filter((e) => !e.category_id && e.is_tax_deductible);
    if (uncategorized.length > 0) {
      items.push({ text: `${uncategorized.length} deductible expenses need categorization`, type: "warning" });
    }
    const noReceipt = filteredExpenses.filter((e) => !e.receipt_url && Number(e.amount) > 75);
    if (noReceipt.length > 0) {
      items.push({ text: `${noReceipt.length} expenses over $75 missing receipts`, type: "warning" });
    }
    const nonDeductible = filteredExpenses.filter((e) => !e.is_tax_deductible);
    if (nonDeductible.length > 5) {
      items.push({ text: `Review ${nonDeductible.length} non-deductible expenses — some may qualify`, type: "info" });
    }
    return items;
  }, [filteredExpenses]);

  const handleExportTaxReport = () => {
    const headers = "Quarter,Gross Income,Deductions,Taxable Income,Estimated Tax,Effective Rate";
    const rows = quarterlyTax.map((q) =>
      [q.quarterLabel, q.income.toFixed(2), q.deductions.toFixed(2), q.taxableIncome.toFixed(2), q.estimatedTax.toFixed(2), `${q.effectiveRate.toFixed(1)}%`].join(",")
    );
    rows.push(["YTD Total", ytdTotals.ytdIncome.toFixed(2), ytdTotals.ytdDeductions.toFixed(2), ytdTotals.taxableIncome.toFixed(2), ytdTotals.ytdTax.toFixed(2), ""].join(","));

    // Deduction breakdown
    rows.push("", "Deduction Breakdown");
    rows.push("Category,Amount");
    deductionBreakdown.forEach((d) => rows.push(`${d.name},${d.total.toFixed(2)}`));

    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tax-report-${new Date().getFullYear()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>;

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExportTaxReport}>
          <Download className="w-3.5 h-3.5 mr-1.5" />Export Tax Report
        </Button>
      </div>

      {/* YTD KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "YTD Gross Income", value: fmtMoney(ytdTotals.ytdIncome), color: "text-emerald-500" },
          { label: "YTD Deductions", value: fmtMoney(ytdTotals.ytdDeductions), color: "text-primary" },
          { label: "Taxable Income", value: fmtMoney(ytdTotals.taxableIncome), color: "text-foreground" },
          { label: "Estimated Tax Due", value: fmtMoney(ytdTotals.ytdTax), color: "text-red-500" },
        ].map((kpi) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className={`text-2xl font-mono font-bold ${kpi.color}`}>{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Quarterly Breakdown Chart */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-muted-foreground" />
          Quarterly Tax Estimates
        </h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={quarterlyTax} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="quarterLabel" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`$${v.toFixed(0)}`, undefined]} />
              <Legend />
              <Bar dataKey="income" name="Gross Income" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="deductions" name="Deductions" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="estimatedTax" name="Est. Tax" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quarterly Table + Deductions */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Quarterly detail table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium flex items-center gap-2">
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
                {quarterlyTax.map((q) => (
                  <tr key={q.quarter} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">{q.quarterLabel}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-500">{fmtMoney(q.income)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-primary">{fmtMoney(q.deductions)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-red-500">{fmtMoney(q.estimatedTax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Deduction breakdown */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium mb-3">Deduction Categories</h3>
          {deductionBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No deductible expenses found. Mark expenses as tax-deductible in the Expense Tracker.</p>
          ) : (
            <div className="space-y-2">
              {deductionBreakdown.map((d) => {
                const maxTotal = deductionBreakdown[0]?.total || 1;
                return (
                  <div key={d.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
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
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium mb-3">Tax Preparation Checklist</h3>
          <div className="space-y-2">
            {actionItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
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
