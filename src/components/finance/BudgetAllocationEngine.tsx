import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, PieChart as PieIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useFinancialIntelligence } from "@/hooks/use-financial-intelligence";
import { Badge } from "@/components/ui/badge";

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

  // Simple ROI-based recommendations
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

  if (isLoading) return <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>;

  const pieData = budgetCategories.slice(0, 8).map((c) => ({
    name: c.name,
    value: Math.round(c.avgMonthlySpend),
    color: c.color,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Avg Monthly Spend</p>
          <p className="text-2xl font-mono font-bold">{fmtMoney(totalMonthlySpend)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Avg Monthly Income</p>
          <p className="text-2xl font-mono font-bold text-emerald-500">{fmtMoney(avgMonthlyIncome)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Expense Ratio</p>
          <p className="text-2xl font-mono font-bold">
            {avgMonthlyIncome > 0 ? `${((totalMonthlySpend / avgMonthlyIncome) * 100).toFixed(0)}%` : "—"}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Categories Tracked</p>
          <p className="text-2xl font-mono font-bold">{budgetCategories.length}</p>
        </div>
      </div>

      {/* Pie + Category Table */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-muted-foreground" />
            Spend Distribution
          </h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value" paddingAngle={2}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number) => [`$${value}`, undefined]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium mb-3">Category Breakdown</h3>
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {budgetCategories.map((cat) => (
              <div key={cat.categoryId} className="flex items-center gap-3 py-1.5">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-sm flex-1 truncate">{cat.name}</span>
                <span className="text-xs font-mono text-muted-foreground w-12 text-right">{cat.percentOfTotal.toFixed(0)}%</span>
                <span className="text-sm font-mono font-medium w-20 text-right">{fmtMoney(cat.avgMonthlySpend)}</span>
                {cat.trend !== 0 && (
                  <span className={`text-xs flex items-center gap-0.5 w-14 justify-end ${cat.trend > 0 ? "text-red-500" : "text-emerald-500"}`}>
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
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-medium mb-4">Budget Recommendations</h3>
        <div className="space-y-3">
          {recommendations.map((rec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
            >
              {rec.type === "decrease" && <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />}
              {rec.type === "increase" && <TrendingUp className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />}
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
