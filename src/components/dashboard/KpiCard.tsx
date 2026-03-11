import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  glowClass?: string;
}

export const KpiCard = memo(function KpiCard({ title, value, change, changeType = "neutral", icon: Icon, glowClass }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "rounded-lg border border-border bg-card p-3 sm:p-5 relative overflow-hidden",
        glowClass
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <p className="text-lg sm:text-2xl font-bold font-mono text-card-foreground">{value}</p>
          {change && (
            <p
              className={cn(
                "text-xs font-medium font-mono",
                changeType === "positive" && "text-success",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className="p-2 rounded-md bg-secondary">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </motion.div>
  );
});
