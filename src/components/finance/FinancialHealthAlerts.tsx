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

  if (isLoading) return null;

  return (
    <div className="space-y-4">
      {/* Health Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Profit Margin</p>
          </div>
          <p className={`text-2xl font-mono font-bold ${health.profitMargin >= 30 ? "text-emerald-500" : health.profitMargin >= 15 ? "text-amber-500" : "text-red-500"}`}>
            {health.profitMargin}%
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Monthly Burn</p>
          </div>
          <p className="text-2xl font-mono font-bold">${health.burnRate.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <PieChart className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Diversification</p>
          </div>
          <p className={`text-2xl font-mono font-bold ${health.diversificationScore >= 50 ? "text-emerald-500" : "text-amber-500"}`}>
            {health.diversificationScore}%
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{health.topRevenueSource} @ {health.topRevenuePercent}%</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Savings Rate</p>
          </div>
          <p className={`text-2xl font-mono font-bold ${health.savingsRate >= 20 ? "text-emerald-500" : "text-amber-500"}`}>
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
                className={`flex items-start gap-3 p-3.5 rounded-lg border ${colorMap[alert.type]}`}
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
