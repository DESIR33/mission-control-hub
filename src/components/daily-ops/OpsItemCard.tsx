import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, X, Clock, Send, ThumbsUp, ThumbsDown,
  ChevronRight, Zap, CalendarClock, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { OpsItem } from "@/hooks/use-daily-ops";
import { SOURCE_ICONS } from "@/hooks/use-daily-ops";
import { safeFormatDistanceToNow } from "@/lib/date-utils";
import { DistanceToNow } from "date-fns";

const urgencyColor = (score: number) => {
  if (score >= 70) return "text-destructive bg-destructive/10 border-destructive/30";
  if (score >= 40) return "text-warning bg-warning/10 border-warning/30";
  return "text-muted-foreground bg-muted border-border";
};

const timeBlockLabel: Record<string, { label: string; icon: typeof Zap }> = {
  morning: { label: "Morning", icon: Zap },
  afternoon: { label: "Afternoon", icon: CalendarClock },
  evening: { label: "Evening", icon: Clock },
};

interface Props {
  item: OpsItem;
  onAction: (action: "done" | "dismissed" | "snoozed" | "approved" | "rejected" | "followed_up", snoozedUntil?: string) => void;
  isActing: boolean;
}

export const OpsItemCard = memo(function OpsItemCard({ item, onAction, isActing }: Props) {
  const [expanded, setExpanded] = useState(false);
  const emoji = SOURCE_ICONS[item.source_type] ?? "📋";
  const tb = timeBlockLabel[item.time_block] || timeBlockLabel.morning;
  const TbIcon = tb.icon;

  return (
    <div
      className={cn(
        "group rounded-lg border bg-card p-3 transition-all hover:shadow-md animate-fade-in",
        item.urgency_score >= 70 && "border-destructive/30"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Score badge */}
        <div className={cn(
          "flex items-center justify-center w-9 h-9 rounded-md text-xs font-mono font-bold border shrink-0",
          urgencyColor(item.urgency_score)
        )}>
          {Math.round(item.urgency_score)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm">{emoji}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
              {item.source_type}
            </Badge>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
              <TbIcon className="w-3 h-3" />
              {tb.label}
            </div>
          </div>

          <p className="text-sm font-medium text-card-foreground truncate">{item.title}</p>

          {item.subtitle && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{item.subtitle}</p>
          )}

          {item.due_at && (
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Due {safeFormatDistanceToNow(item.due_at, { addSuffix: true })}
            </p>
          )}

          {/* Urgency factors */}
          {expanded && item.urgency_factors && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(item.urgency_factors).map(([k, v]) => (
                <Badge key={k} variant="secondary" className="text-[10px] py-0">
                  {k.replace(/_/g, " ")} +{String(v)}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-foreground p-1"
        >
          <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", expanded && "rotate-90")} />
        </button>
      </div>

      {/* Quick actions */}
      <div className={cn(
        "flex items-center gap-1.5 mt-2 pt-2 border-t border-border/50",
        "opacity-0 group-hover:opacity-100 transition-opacity",
        expanded && "opacity-100"
      )}>
        <Button
          size="sm" variant="ghost"
          className="h-7 text-xs gap-1"
          disabled={isActing}
          onClick={() => onAction("done")}
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Done
        </Button>

        {item.source_type === "proposal" && (
          <>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary" disabled={isActing} onClick={() => onAction("approved")}>
              <ThumbsUp className="w-3.5 h-3.5" /> Approve
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive" disabled={isActing} onClick={() => onAction("rejected")}>
              <ThumbsDown className="w-3.5 h-3.5" /> Reject
            </Button>
          </>
        )}

        {(item.source_type === "deal" || item.source_type === "inbox") && (
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" disabled={isActing} onClick={() => onAction("followed_up")}>
            <Send className="w-3.5 h-3.5" /> Follow Up
          </Button>
        )}

        <Button
          size="sm" variant="ghost"
          className="h-7 text-xs gap-1"
          disabled={isActing}
          onClick={() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);
            onAction("snoozed", tomorrow.toISOString());
          }}
        >
          <Clock className="w-3.5 h-3.5" /> Snooze
        </Button>

        <Button
          size="sm" variant="ghost"
          className="h-7 text-xs gap-1 ml-auto text-muted-foreground"
          disabled={isActing}
          onClick={() => onAction("dismissed")}
        >
          <X className="w-3.5 h-3.5" /> Dismiss
        </Button>
      </div>
    </div>
  );
});
