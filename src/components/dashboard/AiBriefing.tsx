import { motion } from "framer-motion";
import { Brain, Sparkles } from "lucide-react";

const briefingItems = [
  {
    type: "insight" as const,
    text: "3 sponsor threads haven't been followed up in 5+ days — potential revenue at risk.",
  },
  {
    type: "action" as const,
    text: "Draft follow-up email to NordVPN (deal value: $12,000). Awaiting your approval.",
  },
  {
    type: "insight" as const,
    text: "Your last 3 videos had 18% higher watch time when published on Tuesdays.",
  },
  {
    type: "action" as const,
    text: "Reschedule 'AI Tools Review' to Tuesday based on performance data?",
  },
];

export function AiBriefing() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="rounded-lg border border-border bg-card p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-md bg-primary/10">
          <Brain className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-card-foreground">
          AI Daily Briefing
        </h3>
        <div className="ml-auto flex items-center gap-1 text-[10px] text-primary font-mono animate-pulse-glow">
          <Sparkles className="w-3 h-3" />
          LIVE
        </div>
      </div>

      <div className="space-y-3">
        {briefingItems.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 text-sm"
          >
            <div
              className={cn(
                "mt-1 w-1.5 h-1.5 rounded-full shrink-0",
                item.type === "action" ? "bg-warning" : "bg-primary"
              )}
            />
            <p className="text-muted-foreground leading-relaxed">
              {item.text}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
        <button className="text-xs font-medium text-primary hover:underline">
          View all proposals →
        </button>
      </div>
    </motion.div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
