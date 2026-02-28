import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AlertCircle, ArrowRight, Clock, User } from "lucide-react";
import type { AttentionItem } from "@/hooks/use-dashboard-stats";

const urgencyStyles = {
  high: "border-l-destructive",
  medium: "border-l-warning",
  low: "border-l-muted-foreground",
};

const typeIcons = {
  overdue: AlertCircle,
  "follow-up": User,
  approval: Clock,
  deadline: Clock,
};

interface NeedsAttentionProps {
  items?: AttentionItem[];
}

export function NeedsAttention({ items = [] }: NeedsAttentionProps) {
  const urgentCount = items.filter((i) => i.urgency === "high").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-lg border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-card-foreground">
          Needs Attention
        </h3>
        {urgentCount > 0 && (
          <span className="text-xs font-mono text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
            {urgentCount} urgent
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          All clear — nothing needs your attention right now.
        </p>
      ) : (
        <div className="space-y-1">
          {items.map((item, i) => {
            const Icon = typeIcons[item.type] || AlertCircle;
            return (
              <button
                key={i}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md border-l-2 text-left transition-colors hover:bg-secondary",
                  urgencyStyles[item.urgency]
                )}
              >
                <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-card-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
