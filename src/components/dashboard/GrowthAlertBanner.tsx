import { useGrowthAlerts, type GrowthAlert } from "@/hooks/use-growth-alerts";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Trophy, AlertTriangle, Info, X } from "lucide-react";

export function GrowthAlertBanner() {
  const { data: alerts = [] } = useGrowthAlerts();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  // Show only the top 3
  const shown = visible.slice(0, 3);

  const dismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  return (
    <AnimatePresence>
      <div className="space-y-2">
        {shown.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className={`rounded-lg border px-4 py-2.5 flex items-center gap-3 ${severityStyles[alert.severity]}`}
          >
            <SeverityIcon severity={alert.severity} />
            <p className="text-sm flex-1">{alert.message}</p>
            <button
              onClick={() => dismiss(alert.id)}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0"
              aria-label="Dismiss alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
}

const severityStyles: Record<GrowthAlert["severity"], string> = {
  celebration: "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400",
  warning: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400",
  info: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400",
};

function SeverityIcon({ severity }: { severity: GrowthAlert["severity"] }) {
  switch (severity) {
    case "celebration":
      return <Trophy className="w-4 h-4 shrink-0" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 shrink-0" />;
    case "info":
      return <Info className="w-4 h-4 shrink-0" />;
  }
}
