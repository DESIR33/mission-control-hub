import { memo } from "react";
import { Brain, Sparkles, AlertCircle, ArrowRight, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import type { BriefingItem, AttentionItem } from "@/hooks/use-dashboard-stats";

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

interface AiBriefingProps {
  items?: BriefingItem[];
  attentionItems?: AttentionItem[];
}

export const AiBriefing = memo(function AiBriefing({ items = [], attentionItems = [] }: AiBriefingProps) {
  const navigate = useNavigate();
  const urgentCount = attentionItems.filter((i) => i.urgency === "high").length;

  return (
    <div className="rounded-lg border border-border bg-card p-3 sm:p-5 overflow-hidden min-w-0 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-md bg-primary/10">
          <Brain className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-card-foreground">
          Daily Briefing
        </h3>
        <div className="ml-auto flex items-center gap-2">
          {urgentCount > 0 && (
            <span className="text-xs font-mono text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
              {urgentCount} urgent
            </span>
          )}
          <div className="flex items-center gap-1 text-xs text-primary font-mono animate-pulse-glow">
            <Sparkles className="w-3 h-3" />
            LIVE
          </div>
        </div>
      </div>

      {/* Briefing insights */}
      {items.length === 0 && attentionItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          All caught up! No urgent items right now.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={`b-${i}`} className="flex items-start gap-3 text-sm">
              <div
                className={cn(
                  "mt-1 w-1.5 h-1.5 rounded-full shrink-0",
                  item.type === "action" ? "bg-warning" : "bg-primary"
                )}
              />
              <p className="text-muted-foreground leading-relaxed break-words">{item.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Needs Attention section */}
      {attentionItems.length > 0 && (
        <>
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs font-semibold text-card-foreground mb-2 uppercase tracking-wider">
              Needs Attention
            </p>
            <div className="space-y-1">
              {attentionItems.map((item, i) => {
                const Icon = typeIcons[item.type] || AlertCircle;
                return (
                  <button
                    key={`a-${i}`}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-md border-l-2 text-left transition-colors hover:bg-secondary",
                      urgencyStyles[item.urgency]
                    )}
                    onClick={() => item.link && navigate(item.link)}
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
          </div>
        </>
      )}

      <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
        <Link to="/ai-bridge" className="text-xs font-medium text-primary hover:underline">
          View all proposals →
        </Link>
      </div>
    </div>
  );
});
