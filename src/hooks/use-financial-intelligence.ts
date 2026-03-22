import { useMemo } from "react";
import { useUnifiedRevenue } from "@/hooks/use-unified-revenue";
import { useExpenses, useRecurringSubscriptions, type Expense, type RecurringSubscription, type ExpenseCategory } from "@/hooks/use-expenses";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { format, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, getQuarter } from "date-fns";

export interface PLMonth {
  month: string;
  monthKey: string;
  income: number;
  sponsorIncome: number;
  affiliateIncome: number;
  adSenseIncome: number;
  productIncome: number;
  expenses: number;
  recurringExpenses: number;
  discretionaryExpenses: number;
  netProfit: number;
  margin: number;
}

export interface BudgetCategory {
  categoryId: string;
  name: string;
  color: string;
  currentSpend: number;
  avgMonthlySpend: number;
  percentOfTotal: number;
  trend: number; // % change MoM
  isDeductible: boolean;
}

export interface QuarterlyTax {
  quarter: string;
  quarterLabel: string;
  income: number;
  deductions: number;
  taxableIncome: number;
  estimatedTax: number;
  effectiveRate: number;
}

export interface FinancialHealth {
  runwayMonths: number;
  diversificationScore: number;
  topRevenueSource: string;
  topRevenuePercent: number;
  burnRate: number;
  profitMargin: number;
  savingsRate: number;
  alerts: FinancialAlert[];
}

export interface FinancialAlert {
  id: string;
  type: "warning" | "danger" | "info" | "success";
  title: string;
  message: string;
}

export function useFinancialIntelligence(monthCount: number = 12, taxYear?: number) {
  const { data: revenueData, isLoading: revLoading } = useUnifiedRevenue(monthCount);
  const { data: expenses = [], isLoading: expLoading } = useExpenses();
  const { data: subs = [] } = useRecurringSubscriptions();
  const { workspaceId } = useWorkspace();

  const { data: categories = [] } = useQuery({
    queryKey: ["expense-categories", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_categories" as any)
        .select("*")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as unknown as ExpenseCategory[];
    },
    enabled: !!workspaceId,
  });

  const { data: productTx = [] } = useQuery({
    queryKey: ["fi-product-tx", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_transactions" as any)
        .select("total_amount, net_amount, transaction_date")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Build P&L
  const plData = useMemo((): PLMonth[] => {
    if (!revenueData) return [];
    const now = new Date();
    return revenueData.monthly.map((rm, i) => {
      const monthDate = startOfMonth(subMonths(now, monthCount - 1 - i));
      const monthEnd = endOfMonth(monthDate);
      const monthKey = format(monthDate, "yyyy-MM");

      const monthExpenses = expenses.filter((e) => {
        const d = new Date(e.expense_date);
        return d >= monthDate && d <= monthEnd;
      });

      // Add prorated recurring subscriptions
      const activeSubs = subs.filter((s) => s.status === "active");
      let recurringTotal = activeSubs.reduce((sum, s) => {
        const amt = Number(s.amount);
        if (s.billing_cycle === "yearly") return sum + amt / 12;
        if (s.billing_cycle === "quarterly") return sum + amt / 3;
        return sum + amt;
      }, 0);

      const discretionaryTotal = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
      const totalExpenses = discretionaryTotal + recurringTotal;

      // Product income for this month
      let productIncome = 0;
      for (const tx of productTx) {
        if (tx.transaction_date?.startsWith(monthKey)) {
          productIncome += Number(tx.net_amount || tx.total_amount) || 0;
        }
      }

      const income = rm.total + productIncome;
      const netProfit = income - totalExpenses;
      const margin = income > 0 ? (netProfit / income) * 100 : 0;

      return {
        month: rm.month,
        monthKey,
        income,
        sponsorIncome: rm.sponsors,
        affiliateIncome: rm.affiliates,
        adSenseIncome: rm.adSense,
        productIncome,
        expenses: totalExpenses,
        recurringExpenses: recurringTotal,
        discretionaryExpenses: discretionaryTotal,
        netProfit,
        margin,
      };
    });
  }, [revenueData, expenses, subs, productTx, monthCount]);

  // Budget categories
  const budgetCategories = useMemo((): BudgetCategory[] => {
    const now = new Date();
    const threeMonthsAgo = subMonths(now, 3);
    const oneMonthAgo = subMonths(now, 1);
    const twoMonthsAgo = subMonths(now, 2);

    const recentExpenses = expenses.filter((e) => new Date(e.expense_date) >= threeMonthsAgo);
    const byCategory = new Map<string, { total: number; lastMonth: number; prevMonth: number; deductible: boolean }>();

    recentExpenses.forEach((e) => {
      const key = e.category_id || "uncategorized";
      const d = new Date(e.expense_date);
      const entry = byCategory.get(key) || { total: 0, lastMonth: 0, prevMonth: 0, deductible: false };
      entry.total += Number(e.amount);
      if (d >= oneMonthAgo) entry.lastMonth += Number(e.amount);
      else if (d >= twoMonthsAgo) entry.prevMonth += Number(e.amount);
      entry.deductible = e.is_tax_deductible;
      byCategory.set(key, entry);
    });

    const grandTotal = Array.from(byCategory.values()).reduce((s, v) => s + v.total, 0);

    return Array.from(byCategory.entries()).map(([id, data]) => ({
      categoryId: id,
      name: id === "uncategorized" ? "Uncategorized" : catMap.get(id)?.name || "Unknown",
      color: id === "uncategorized" ? "#94a3b8" : catMap.get(id)?.color || "#6366f1",
      currentSpend: data.lastMonth,
      avgMonthlySpend: data.total / 3,
      percentOfTotal: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
      trend: data.prevMonth > 0 ? ((data.lastMonth - data.prevMonth) / data.prevMonth) * 100 : 0,
      isDeductible: data.deductible,
    })).sort((a, b) => b.avgMonthlySpend - a.avgMonthlySpend);
  }, [expenses, catMap]);

  // Quarterly tax
  const quarterlyTax = useMemo((): QuarterlyTax[] => {
    const year = taxYear ?? new Date().getFullYear();
    const quarters: QuarterlyTax[] = [];
    const taxRate = 0.25; // estimated self-employment + income

    for (let q = 1; q <= 4; q++) {
      const qStart = startOfQuarter(new Date(year, (q - 1) * 3, 1));
      const qEnd = endOfQuarter(qStart);
      const qKey = `${year}-Q${q}`;

      let income = 0;
      let deductions = 0;

      // Sum income from P&L data for the quarter
      plData.forEach((m) => {
        const mDate = new Date(m.monthKey + "-01");
        if (mDate >= qStart && mDate <= qEnd) {
          income += m.income;
        }
      });

      // Sum deductible expenses directly by expense_date within the quarter
      deductions += expenses
        .filter((e) => {
          if (!e.is_tax_deductible) return false;
          const eDate = new Date(e.expense_date);
          return eDate >= qStart && eDate <= qEnd;
        })
        .reduce((s, e) => s + Number(e.amount), 0);

      // Add deductible recurring subs prorated
      const deductibleSubs = subs.filter((s) => s.status === "active" && s.is_tax_deductible);
      const monthlyDeductibleRecurring = deductibleSubs.reduce((sum, s) => {
        const amt = Number(s.amount);
        if (s.billing_cycle === "yearly") return sum + amt / 12;
        if (s.billing_cycle === "quarterly") return sum + amt / 3;
        return sum + amt;
      }, 0);
      deductions += monthlyDeductibleRecurring * 3;

      const taxableIncome = Math.max(income - deductions, 0);
      const estimatedTax = taxableIncome * taxRate;

      quarters.push({
        quarter: qKey,
        quarterLabel: `Q${q} ${year}`,
        income,
        deductions,
        taxableIncome,
        estimatedTax: Math.round(estimatedTax),
        effectiveRate: income > 0 ? (estimatedTax / income) * 100 : 0,
      });
    }

    return quarters;
  }, [plData, expenses, subs, taxYear]);

  // Financial health
  const health = useMemo((): FinancialHealth => {
    const alerts: FinancialAlert[] = [];
    const last3 = plData.slice(-3);
    const avgIncome = last3.length > 0 ? last3.reduce((s, m) => s + m.income, 0) / last3.length : 0;
    const avgExpenses = last3.length > 0 ? last3.reduce((s, m) => s + m.expenses, 0) / last3.length : 0;
    const burnRate = avgExpenses;
    const netAvg = avgIncome - avgExpenses;
    const runwayMonths = burnRate > 0 && netAvg > 0 ? Infinity : burnRate > 0 ? Math.abs(netAvg) > 0 ? avgIncome / burnRate : 0 : Infinity;

    // Diversification
    const totalRev = revenueData?.totalRevenue || 1;
    const sponsorPct = ((revenueData?.sponsorTotal || 0) / totalRev) * 100;
    const affiliatePct = ((revenueData?.affiliateTotal || 0) / totalRev) * 100;
    const adSensePct = ((revenueData?.adSenseTotal || 0) / totalRev) * 100;

    const sources = [
      { name: "Sponsors", pct: sponsorPct },
      { name: "Affiliates", pct: affiliatePct },
      { name: "AdSense", pct: adSensePct },
    ].sort((a, b) => b.pct - a.pct);

    const topSource = sources[0];
    // HHI-based diversification (lower = more diverse)
    const hhi = sources.reduce((s, src) => s + (src.pct / 100) ** 2, 0);
    const diversificationScore = Math.round((1 - hhi) * 100);

    const profitMargin = avgIncome > 0 ? ((avgIncome - avgExpenses) / avgIncome) * 100 : 0;
    const savingsRate = avgIncome > 0 ? (netAvg / avgIncome) * 100 : 0;

    // Generate alerts
    if (topSource.pct > 60) {
      alerts.push({
        id: "diversification",
        type: "warning",
        title: "Revenue Concentration Risk",
        message: `${Math.round(topSource.pct)}% of revenue comes from ${topSource.name}. Consider diversifying.`,
      });
    }

    if (profitMargin < 20 && avgIncome > 0) {
      alerts.push({
        id: "low-margin",
        type: "warning",
        title: "Low Profit Margin",
        message: `Profit margin is ${profitMargin.toFixed(0)}%. Target 30%+ for sustainable growth.`,
      });
    }

    if (runwayMonths < 6 && runwayMonths !== Infinity) {
      alerts.push({
        id: "runway",
        type: "danger",
        title: "Low Runway",
        message: `Runway is ${runwayMonths.toFixed(1)} months at current burn rate.`,
      });
    }

    const lastMonth = plData[plData.length - 1];
    const prevMonth = plData[plData.length - 2];
    if (lastMonth && prevMonth && lastMonth.income < prevMonth.income * 0.8) {
      alerts.push({
        id: "revenue-drop",
        type: "danger",
        title: "Revenue Drop",
        message: `Revenue dropped ${Math.round(((prevMonth.income - lastMonth.income) / prevMonth.income) * 100)}% month-over-month.`,
      });
    }

    if (profitMargin > 40) {
      alerts.push({
        id: "healthy",
        type: "success",
        title: "Strong Margins",
        message: `${profitMargin.toFixed(0)}% profit margin — well above healthy threshold.`,
      });
    }

    return {
      runwayMonths: runwayMonths === Infinity ? 999 : Math.round(runwayMonths * 10) / 10,
      diversificationScore,
      topRevenueSource: topSource.name,
      topRevenuePercent: Math.round(topSource.pct),
      burnRate: Math.round(burnRate),
      profitMargin: Math.round(profitMargin),
      savingsRate: Math.round(savingsRate),
      alerts,
    };
  }, [plData, revenueData]);

  return {
    plData,
    budgetCategories,
    quarterlyTax,
    health,
    categories,
    isLoading: revLoading || expLoading,
  };
}
