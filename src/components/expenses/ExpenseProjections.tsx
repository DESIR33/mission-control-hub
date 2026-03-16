import { useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { BudgetCard } from "@/components/ui/analytics-bento";
import { useExpenses, useRecurringSubscriptions, type ExpenseCategory } from "@/hooks/use-expenses";

interface Props {
  categories: ExpenseCategory[];
}

export function ExpenseProjections({ categories }: Props) {
  const { data: expenses = [] } = useExpenses();
  const { data: subs = [] } = useRecurringSubscriptions();

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const projectionData = useMemo(() => {
    const now = new Date();
    const months: { month: string; actual: number; projected: number }[] = [];

    // Past 6 months actuals
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const monthExpenses = expenses.filter((e) => {
        const d = new Date(e.expense_date);
        return d >= monthStart && d <= monthEnd;
      });
      const total = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
      months.push({ month: format(monthStart, "MMM yyyy"), actual: total, projected: 0 });
    }

    // Monthly recurring cost
    const activeSubs = subs.filter((s) => s.status === "active");
    const monthlyRecurring = activeSubs.reduce((sum, s) => {
      const amt = Number(s.amount);
      if (s.billing_cycle === "yearly") return sum + amt / 12;
      if (s.billing_cycle === "quarterly") return sum + amt / 3;
      return sum + amt;
    }, 0);

    // Average discretionary spending (non-recurring) over past 3 months
    const last3 = months.slice(-3);
    const avgDiscretionary = last3.reduce((s, m) => s + m.actual, 0) / 3 - monthlyRecurring;
    const projectedMonthly = monthlyRecurring + Math.max(avgDiscretionary, 0);

    // Future 6 months projection
    for (let i = 1; i <= 6; i++) {
      const monthStart = startOfMonth(addMonths(now, i));
      months.push({
        month: format(monthStart, "MMM yyyy"),
        actual: 0,
        projected: Math.round(projectedMonthly * 100) / 100,
      });
    }

    return { months, monthlyRecurring, projectedMonthly, avgDiscretionary: Math.max(avgDiscretionary, 0) };
  }, [expenses, subs]);

  // Category breakdown from last 30 days
  const categoryBreakdown = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = subMonths(now, 1);
    const recent = expenses.filter((e) => new Date(e.expense_date) >= thirtyDaysAgo);
    const byCategory = new Map<string, number>();
    recent.forEach((e) => {
      const key = e.category_id || "uncategorized";
      byCategory.set(key, (byCategory.get(key) || 0) + Number(e.amount));
    });
    return Array.from(byCategory.entries())
      .map(([id, total]) => ({
        id,
        name: id === "uncategorized" ? "Uncategorized" : catMap.get(id)?.name || "Unknown",
        color: id === "uncategorized" ? "#94a3b8" : catMap.get(id)?.color || "#6366f1",
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, catMap]);

  const totalThisMonth = projectionData.months[5]?.actual ?? 0;
  const totalLastMonth = projectionData.months[4]?.actual ?? 0;
  const monthChange = totalLastMonth > 0 ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">This Month</p>
          <p className="text-2xl font-mono font-bold">${totalThisMonth.toFixed(0)}</p>
          {monthChange !== 0 && (
            <p className={`text-xs flex items-center gap-1 ${monthChange > 0 ? "text-red-500" : "text-emerald-500"}`}>
              {monthChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(monthChange).toFixed(0)}% vs last month
            </p>
          )}
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Monthly Recurring</p>
          <p className="text-2xl font-mono font-bold">${projectionData.monthlyRecurring.toFixed(0)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Avg Discretionary</p>
          <p className="text-2xl font-mono font-bold">${projectionData.avgDiscretionary.toFixed(0)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Projected Monthly</p>
          <p className="text-2xl font-mono font-bold flex items-center gap-1">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            ${projectionData.projectedMonthly.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-4">Spending Trend & Projection</h3>
        <div className="h-[280px]">
          <BudgetCard />
        </div>
      </div>

      {/* Category breakdown */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">Last 30 Days by Category</h3>
        {categoryBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No expenses in the last 30 days.</p>
        ) : (
          <div className="space-y-2">
            {categoryBreakdown.map((cat) => {
              const maxTotal = categoryBreakdown[0]?.total || 1;
              return (
                <div key={cat.id} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm w-32 truncate">{cat.name}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(cat.total / maxTotal) * 100}%`, backgroundColor: cat.color }} />
                  </div>
                  <span className="text-sm font-mono font-medium w-20 text-right">${cat.total.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
