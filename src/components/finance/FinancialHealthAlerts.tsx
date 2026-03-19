import { motion } from "framer-motion";
import { AlertTriangle, AlertCircle, CheckCircle2, Info, Shield, Activity, PieChart, Flame } from "lucide-react";
import { useFinancialIntelligence } from "@/hooks/use-financial-intelligence";

const iconMap = {
  warning: AlertTriangle,
  danger: AlertCircle,
  info: Info,
  success: CheckCircle2,
};

const colorMap = {
  warning: "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400",
  danger: "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400",
  info: "border-primary/30 bg-primary/5 text-primary",
  success: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
};

export function FinancialHealthAlerts() {
  const { health, isLoading } = useFinancialIntelligence(6);

  if (isLoading) return <div className="rounded-xl border border-border bg-card p-6 animate-pulse h-48" />;

  return (
    <div className="space-y-4">
      {/* Health Score Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Profit Margin</p>
          </div>
          <p className={`text-lg font-bold font-mono ${health.profitMargin >= 30 ? "text-green-400" : health.profitMargin >= 15 ? "text-amber-400" : "text-red-400"}`}>
            {health.profitMargin}%
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Flame className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Monthly Burn</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">${health.burnRate.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <PieChart className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Diversification</p>
          </div>
          <p className={`text-lg font-bold font-mono ${health.diversificationScore >= 50 ? "text-green-400" : "text-amber-400"}`}>
            {health.diversificationScore}%
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{health.topRevenueSource} @ {health.topRevenuePercent}%</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Savings Rate</p>
          </div>
          <p className={`text-lg font-bold font-mono ${health.savingsRate >= 20 ? "text-green-400" : "text-amber-400"}`}>
            {health.savingsRate}%
          </p>
        </div>
      </div>

      {/* Alert Cards */}
      {health.alerts.length > 0 && (
        <div className="space-y-2">
          {health.alerts.map((alert, i) => {
            const Icon = iconMap[alert.type];
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`flex items-start gap-3 p-3.5 rounded-xl border ${colorMap[alert.type]}`}
              >
                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs opacity-80 mt-0.5">{alert.message}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
