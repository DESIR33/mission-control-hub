import { useState } from "react";
import {
  Calendar, Lightbulb, Repeat, FlaskConical, Sparkles,
  ChevronDown, ChevronRight, Check, X, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useWeeklyActionPlan,
  useGenerateWeeklyPlan,
  useUpdateActionItem,
  type ActionItem,
} from "@/hooks/use-weekly-action-plan";
import { format, startOfWeek } from "date-fns";

const sectionConfig = {
  topics: {
    label: "Top Video Topics",
    icon: Lightbulb,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
  },
  schedule: {
    label: "Posting Schedule",
    icon: Calendar,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  doubleDown: {
    label: "Double Down",
    icon: Repeat,
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  experiments: {
    label: "Experiment",
    icon: FlaskConical,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
};

const statusBadge: Record<ActionItem["status"], { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  accepted: { label: "Accepted", cls: "bg-green-500/15 text-green-400 border-green-500/30" },
  dismissed: { label: "Dismissed", cls: "bg-gray-500/15 text-gray-400 border-gray-500/30" },
};

function ActionItemRow({ item }: { item: ActionItem }) {
  const updateItem = useUpdateActionItem();
  const [localStatus, setLocalStatus] = useState(item.status);

  const handleAction = (action: "accepted" | "dismissed") => {
    setLocalStatus(action);
    updateItem.mutate({ itemId: item.id, action });
  };

  const badge = statusBadge[localStatus];

  return (
    <div className="flex items-start gap-2 py-2 px-1 group animate-fade-in">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm ${localStatus === "dismissed" ? "text-muted-foreground line-through" : "text-foreground"}`}>
            {item.title}
          </p>
          <Badge variant="outline" className={`text-[9px] shrink-0 ${badge.cls}`}>
            {badge.label}
          </Badge>
        </div>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {item.description}
          </p>
        )}
      </div>

      {localStatus === "new" && (
        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => handleAction("accepted")}
            className="p-1 rounded hover:bg-green-500/10 text-muted-foreground hover:text-green-400 transition-colors"
            aria-label="Accept"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleAction("dismissed")}
            className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({
  sectionKey,
  items,
}: {
  sectionKey: keyof typeof sectionConfig;
  items: ActionItem[];
}) {
  const [open, setOpen] = useState(true);
  const config = sectionConfig[sectionKey];
  const Icon = config.icon;

  if (items.length === 0) return null;

  return (
    <div className="border-t border-border first:border-t-0 pt-2 first:pt-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left py-1 hover:bg-secondary/50 rounded px-1 transition-colors"
      >
        <div className={`p-1 rounded ${config.bg}`}>
          <Icon className={`w-3 h-3 ${config.color}`} />
        </div>
        <span className="text-xs font-semibold text-foreground flex-1">{config.label}</span>
        <span className="text-[10px] text-muted-foreground mr-1">{items.length}</span>
        {open ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="overflow-hidden animate-fade-in">
          <div className="pl-2 space-y-0.5">
            {items.map((item) => (
              <ActionItemRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function WeeklyActionPlanCard() {
  const { plan, isLoading } = useWeeklyActionPlan();
  const generatePlan = useGenerateWeeklyPlan();

  const weekLabel = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "MMM d");

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5 animate-pulse">
        <div className="h-5 w-40 bg-muted rounded mb-4" />
        <div className="space-y-3">
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-3/4 bg-muted rounded" />
          <div className="h-4 w-5/6 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-card/50 backdrop-blur-sm p-6 text-center animate-fade-in">
        <Sparkles className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground mb-1">No plan for this week</p>
        <p className="text-xs text-muted-foreground mb-3">
          Generate an AI-powered action plan based on your channel analytics.
        </p>
        <Button
          size="sm"
          onClick={() => generatePlan.mutate()}
          disabled={generatePlan.isPending}
          className="gap-1.5"
        >
          {generatePlan.isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Generate Plan
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-card-foreground">This Week's Plan</h3>
            <p className="text-[10px] text-muted-foreground">Week of {weekLabel}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => generatePlan.mutate()}
          disabled={generatePlan.isPending}
        >
          {generatePlan.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          Regenerate
        </Button>
      </div>

      {/* Sections */}
      <div className="space-y-2">
        <CollapsibleSection sectionKey="topics" items={plan.topics} />
        <CollapsibleSection sectionKey="schedule" items={plan.schedule} />
        <CollapsibleSection sectionKey="doubleDown" items={plan.doubleDown} />
        <CollapsibleSection sectionKey="experiments" items={plan.experiments} />
      </div>

      {plan.allItems.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Plan has no actionable items. Try regenerating.
        </p>
      )}
    </div>
  );
}
