import { memo } from "react";
import { Brain, Sparkles, ArrowRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { safeFormat } from "@/lib/date-utils";
import type { BriefingItem } from "@/hooks/use-dashboard-stats";

function classifyLine(text: string): "urgent" | "action" | "win" | "insight" {
  if (text.startsWith("🔴")) return "urgent";
  if (text.startsWith("🟡")) return "action";
  if (text.startsWith("🟢")) return "win";
  return "insight";
}

const dotColor = {
  urgent: "bg-destructive",
  action: "bg-warning",
  win: "bg-green-500",
  insight: "bg-primary",
};

interface Props {
  items?: BriefingItem[];
}

export const MissionBriefingPanel = memo(function MissionBriefingPanel({ items = [] }: Props) {
  const navigate = useNavigate();
  const today = safeFormat(new Date(), "yyyy-MM-dd");

  const handleItemClick = (index: number) => {
    navigate(`/briefing/${today}?item=${index}`);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 overflow-hidden min-w-0 animate-fade-in">
      <Link to="/briefing" className="flex items-center gap-2 mb-3 group">
        <div className="p-1.5 rounded-md bg-primary/10">
          <Brain className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-card-foreground group-hover:text-primary transition-colors">
          Daily Briefing
        </h3>
        <div className="ml-auto flex items-center gap-1 text-xs text-primary font-mono animate-pulse-glow">
          <Sparkles className="w-3 h-3" />
          LIVE
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </Link>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">All caught up! No urgent items right now.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item, i) => {
            const type = classifyLine(item.text);
            return (
              <button
                key={i}
                onClick={() => handleItemClick(i)}
                className="w-full flex items-start gap-2.5 text-sm text-left px-2 py-1.5 rounded-md hover:bg-secondary/60 transition-colors group/item cursor-pointer"
              >
                <div className={cn("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0", dotColor[type])} />
                <p className="text-muted-foreground leading-relaxed break-words text-xs flex-1">{item.text}</p>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover/item:opacity-100 transition-opacity mt-0.5 shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
