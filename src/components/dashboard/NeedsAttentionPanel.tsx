import { memo } from "react";
import { AlertCircle, ArrowRight, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
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

interface Props {
  items?: AttentionItem[];
}

export const NeedsAttentionPanel = memo(function NeedsAttentionPanel({ items = [] }: Props) {
  const navigate = useNavigate();
  const urgentCount = items.filter((i) => i.urgency === "high").length;

  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 overflow-hidden min-w-0 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-md bg-destructive/10">
          <AlertCircle className="w-4 h-4 text-destructive" />
        </div>
        <h3 className="text-sm font-semibold text-card-foreground">Needs Attention</h3>
        {urgentCount > 0 && (
          <span className="ml-auto text-xs font-mono text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
            {urgentCount} urgent
          </span>
        )}
      </div>

      <div className="space-y-1">
        {items.map((item, i) => {
          const Icon = typeIcons[item.type] || AlertCircle;
          return (
            <button
              key={i}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md border-l-2 text-left transition-colors hover:bg-secondary",
                urgencyStyles[item.urgency]
              )}
              onClick={() => item.link && navigate(item.link)}
            >
              <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-card-foreground truncate">{item.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{item.subtitle}</p>
              </div>
              <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
});
