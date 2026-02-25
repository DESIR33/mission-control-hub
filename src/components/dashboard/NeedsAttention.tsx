import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AlertCircle, ArrowRight, Clock, User } from "lucide-react";

interface AttentionItem {
  title: string;
  subtitle: string;
  type: "overdue" | "follow-up" | "approval" | "deadline";
  urgency: "high" | "medium" | "low";
}

const items: AttentionItem[] = [
  {
    title: "NordVPN Sponsorship Response",
    subtitle: "Follow-up overdue by 3 days",
    type: "follow-up",
    urgency: "high",
  },
  {
    title: "Q1 Revenue Report",
    subtitle: "Due tomorrow · 2 tasks remaining",
    type: "deadline",
    urgency: "high",
  },
  {
    title: "AI Draft: Outreach to Skillshare",
    subtitle: "Awaiting your approval",
    type: "approval",
    urgency: "medium",
  },
  {
    title: "Video #47 - Final Review",
    subtitle: "Editing complete, needs sign-off",
    type: "approval",
    urgency: "medium",
  },
  {
    title: "Update affiliate links for Q1",
    subtitle: "5 links expired",
    type: "overdue",
    urgency: "low",
  },
];

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

export function NeedsAttention() {
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
        <span className="text-xs font-mono text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
          {items.filter((i) => i.urgency === "high").length} urgent
        </span>
      </div>

      <div className="space-y-1">
        {items.map((item, i) => {
          const Icon = typeIcons[item.type];
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
    </motion.div>
  );
}
