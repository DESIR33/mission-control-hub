import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Target, TrendingUp, DollarSign, Zap, Pencil, Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from "recharts";
import { BudgetCard } from "@/components/ui/analytics-bento";
import {
  chartTooltipStyle, xAxisDefaults, yAxisDefaults, cartesianGridDefaults,
  barDefaults, fmtMoney, fmtCount, CHART_COLORS,
} from "@/lib/chart-theme";
import { useRevenueGoals } from "@/hooks/use-revenue-goals";

export function RevenueGoalTracker() {
  const {
    goal,
    monthlyRevenueByStream,
    revenuePerKSubs,
    rpmTrend,
    pendingOpportunities,
    currentMonthRevenue,
    isLoading,
    updateRevenueGoal,
  } = useRevenueGoals();

  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const targetValue = goal?.target_value ?? 0;
  const progressPct = targetValue > 0 ? Math.min((currentMonthRevenue / targetValue) * 100, 100) : 0;
  const totalPendingValue = pendingOpportunities.reduce((s, o) => s + o.value, 0);

  const handleSaveGoal = () => {
    const val = parseFloat(goalInput);
    if (isNaN(val) || val <= 0) {
      toast.error("Enter a valid target amount");
      return;
    }
    updateRevenueGoal.mutate(val, {
      onSuccess: () => {
        toast.success("Revenue goal updated!");
        setEditingGoal(false);
      },
      onError: (err) => toast.error(`Failed: ${err.message}`),
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Monthly Revenue Goal */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Revenue Goal Tracker</h2>
          </div>
          {!editingGoal ? (
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1"
              onClick={() => {
                setGoalInput(String(targetValue || ""));
                setEditingGoal(true);
              }}
            >
              <Pencil className="w-3 h-3" /> Set Goal
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="w-28 h-8 text-xs"
                placeholder="Monthly target"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
              />
              <Button
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={handleSaveGoal}
                disabled={updateRevenueGoal.isPending}
              >
                <Check className="w-3 h-3" /> Save
              </Button>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Monthly Progress: <strong className="text-foreground">{fmtMoney(currentMonthRevenue)}</strong>
              {targetValue > 0 && (
                <span className="text-muted-foreground"> / {fmtMoney(targetValue)}</span>
              )}
            </span>
            <span className="text-muted-foreground font-medium">{progressPct.toFixed(0)}%</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${
                progressPct >= 100
                  ? "bg-green-500"
                  : progressPct >= 75
                  ? "bg-primary"
                  : progressPct >= 50
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
            />
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">This Month</p>
            <p className="text-lg font-bold text-foreground mt-1">{fmtMoney(currentMonthRevenue)}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rev / 1K Subs</p>
            <p className="text-lg font-bold text-foreground mt-1">{fmtMoney(revenuePerKSubs)}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Latest RPM</p>
            <p className="text-lg font-bold text-foreground mt-1">
              {rpmTrend.length > 0 ? fmtMoney(rpmTrend[rpmTrend.length - 1].rpm) : "$0"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pipeline</p>
            <p className="text-lg font-bold text-foreground mt-1">{fmtMoney(totalPendingValue)}</p>
          </div>
        </div>
      </div>

      {/* Revenue by Stream - Stacked Bar */}
      {monthlyRevenueByStream.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            Revenue by Stream
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenueByStream}>
                <CartesianGrid {...cartesianGridDefaults} />
                <XAxis dataKey="month" {...xAxisDefaults} />
                <YAxis {...yAxisDefaults} tickFormatter={(v) => fmtMoney(v)} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => fmtMoney(v)} />
                <Legend />
                <Bar dataKey="sponsors" stackId="rev" name="Sponsors" fill={CHART_COLORS[0]} {...barDefaults} />
                <Bar dataKey="affiliates" stackId="rev" name="Affiliates" fill={CHART_COLORS[1]} {...barDefaults} />
                <Bar dataKey="ads" stackId="rev" name="Ad Revenue" fill={CHART_COLORS[2]} {...barDefaults} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* RPM Trend */}
      {rpmTrend.length > 1 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            RPM Trend (Revenue per 1,000 Views)
          </h3>
          <BudgetCard />
        </div>
      )}

      {/* Revenue Opportunities */}
      {pendingOpportunities.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Revenue Opportunities
          </h3>
          <div className="space-y-2">
            {pendingOpportunities.slice(0, 8).map((opp, i) => (
              <motion.div
                key={opp.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{opp.title}</p>
                  <Badge variant="outline" className="text-[10px] capitalize mt-0.5">
                    {opp.stage.replace(/_/g, " ")}
                  </Badge>
                </div>
                <span className="text-sm font-bold text-green-500 shrink-0 ml-3">
                  {fmtMoney(opp.value)}
                </span>
              </motion.div>
            ))}
            <p className="text-xs text-muted-foreground text-center pt-2">
              Total pipeline: <strong>{fmtMoney(totalPendingValue)}</strong> from {pendingOpportunities.length} deal(s)
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
