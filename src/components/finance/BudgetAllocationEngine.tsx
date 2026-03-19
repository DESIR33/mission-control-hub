import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, PieChart as PieIcon, DollarSign, Percent, Layers } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useFinancialIntelligence } from "@/hooks/use-financial-intelligence";
import { Badge } from "@/components/ui/badge";
import { chartTooltipStyle, pieDefaults } from "@/lib/chart-theme";

const fmtMoney = (v: number) => `$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function BudgetAllocationEngine() {
  const { budgetCategories, plData, health, isLoading } = useFinancialIntelligence(6);

  const totalMonthlySpend = useMemo(
    () => budgetCategories.reduce((s, c) => s + c.avgMonthlySpend, 0),
    [budgetCategories]
  );

  const avgMonthlyIncome = useMemo(() => {
    if (plData.length === 0) return 0;
    return plData.reduce((s, m) => s + m.income, 0) / plData.length;
  }, [plData]);

  const recommendations = useMemo(() => {
    const recs: { title: string; description: string; type: "increase" | "decrease" | "maintain" }[] = [];
    const expenseRatio = avgMonthlyIncome > 0 ? (totalMonthlySpend / avgMonthlyIncome) * 100 : 0;

    if (expenseRatio > 60) {
      recs.push({
        title: "Reduce total spend",
        description: `Expenses are ${expenseRatio.toFixed(0)}% of income. Target under 50% for healthy margins.`,
        type: "decrease",
      });
    }

    budgetCategories.forEach((cat) => {
      if (cat.trend > 30 && cat.avgMonthlySpend > 100) {
        recs.push({
          title: `Review ${cat.name} spending`,
          description: `Up ${cat.trend.toFixed(0)}% MoM — averaging ${fmtMoney(cat.avgMonthlySpend)}/mo.`,
          type: "decrease",
        });
      }
    });

    if (health.profitMargin > 40 && avgMonthlyIncome > 0) {
      recs.push({
        title: "Consider reinvestment",
        description: `${health.profitMargin}% margin gives room to invest in growth (ads, equipment, contractors).`,
        type: "increase",
      });
    }

    if (recs.length === 0) {
      recs.push({
        title: "Budget looks healthy",
        description: "Spending is balanced relative to income. Keep monitoring monthly.",
        type: "maintain",
      });
    }

    return recs;
  }, [budgetCategories, avgMonthlyIncome, totalMonthlySpend, health]);

  if (isLoading) return <div className="rounded-xl border border-border bg-card p-6 animate-pulse h-96" />;

  const pieData = budgetCategories.slice(0, 8).map((c) => ({
    name: c.name,
    value: Math.round(c.avgMonthlySpend),
    color: c.color,
  }));

  const expenseRatio = avgMonthlyIncome > 0 ? ((totalMonthlySpend / avgMonthlyIncome) * 100).toFixed(0) : "—";

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-red-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Monthly Spend</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{fmtMoney(totalMonthlySpend)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Monthly Income</p>
          </div>
          <p className="text-lg font-bold font-mono text-green-400">{fmtMoney(avgMonthlyIncome)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Percent className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Expense Ratio</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{expenseRatio}%</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Layers className="w-3.5 h-3.5 text-purple-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Categories</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{budgetCategories.length}</p>
        </div>
      </div>

      {/* Pie + Category Table */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-muted-foreground" />
            Spend Distribution
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" {...pieDefaults}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [`$${value}`, undefined]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Category Breakdown</h3>
          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {budgetCategories.map((cat) => (
              <div key={cat.categoryId} className="flex items-center gap-3 py-1.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-sm flex-1 truncate">{cat.name}</span>
                <span className="text-xs font-mono text-muted-foreground w-12 text-right">{cat.percentOfTotal.toFixed(0)}%</span>
                <span className="text-sm font-mono font-medium w-20 text-right">{fmtMoney(cat.avgMonthlySpend)}</span>
                {cat.trend !== 0 && (
                  <span className={`text-xs flex items-center gap-0.5 w-14 justify-end ${cat.trend > 0 ? "text-red-400" : "text-green-400"}`}>
                    {cat.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(cat.trend).toFixed(0)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Budget Recommendations</h3>
        <div className="space-y-2">
          {recommendations.map((rec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-3 p-3 rounded-xl bg-muted/30"
            >
              {rec.type === "decrease" && <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />}
              {rec.type === "increase" && <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />}
              {rec.type === "maintain" && <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />}
              <div>
                <p className="text-sm font-medium">{rec.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p>
              </div>
              <Badge variant="outline" className="ml-auto shrink-0 text-xs">
                {rec.type}
              </Badge>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
