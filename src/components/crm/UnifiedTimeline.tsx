import { useState, useMemo } from "react";
import { DistanceToNow } from "date-fns";
import {
  Phone,
  Calendar,
  Mail,
  MessageSquare,
  TrendingUp,
  Brain,
  Youtube,
  FileText,
  Plus,
  X,
  Filter,
  Heart,
  Clock,
  Activity,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useUnifiedTimeline, type TimelineEvent } from "@/hooks/use-unified-timeline";
import { useCreateActivity } from "@/hooks/use-contacts";
import { toast } from "sonner";
import { safeFormatDistanceToNow } from "@/lib/date-utils";

type EventFilter = "all" | "activity" | "email" | "deal_change" | "youtube_lead" | "proposal";

const FILTER_OPTIONS: { value: EventFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "activity", label: "Activities" },
  { value: "email", label: "Emails" },
  { value: "deal_change", label: "Deals" },
  { value: "youtube_lead", label: "YouTube" },
  { value: "proposal", label: "Proposals" },
];

const QUICK_LOG_TYPES = [
  { value: "call", label: "Call", icon: Phone },
  { value: "meeting", label: "Meeting", icon: Calendar },
  { value: "note", label: "Note", icon: FileText },
] as const;

type QuickLogType = (typeof QUICK_LOG_TYPES)[number]["value"];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Phone,
  Calendar,
  Mail,
  MessageSquare,
  TrendingUp,
  Brain,
  Youtube,
  FileText,
};

function getIcon(iconName: string): React.ComponentType<{ className?: string }> {
  return ICON_MAP[iconName] ?? MessageSquare;
}

function RelationshipHealth({ events }: { events: TimelineEvent[] }) {
  const health = useMemo(() => {
    if (!events.length) {
      return {
        daysSinceContact: null,
        totalInteractions: 0,
        mostFrequentType: null as string | null,
        status: "unknown" as "healthy" | "warm" | "cold" | "unknown",
      };
    }

    const latest = events[0];
    const daysSince = Math.floor(
      (Date.now() - new Date(latest.timestamp).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Count by type
    const typeCounts = new Map<string, number>();
    for (const ev of events) {
      typeCounts.set(ev.type, (typeCounts.get(ev.type) ?? 0) + 1);
    }
    let mostFrequentType: string | null = null;
    let maxCount = 0;
    typeCounts.forEach((count, type) => {
      if (count > maxCount) {
        maxCount = count;
        mostFrequentType = type;
      }
    });

    const status: "healthy" | "warm" | "cold" =
      daysSince <= 7 ? "healthy" : daysSince <= 30 ? "warm" : "cold";

    return {
      daysSinceContact: daysSince,
      totalInteractions: events.length,
      mostFrequentType,
      status,
    };
  }, [events]);

  const statusConfig = {
    healthy: {
      label: "Healthy",
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/30",
    },
    warm: {
      label: "Warm",
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
    },
    cold: {
      label: "Cold",
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
    },
    unknown: {
      label: "No Data",
      color: "text-muted-foreground",
      bg: "bg-muted/50",
      border: "border-border",
    },
  };

  const config = statusConfig[health.status];

  const typeLabels: Record<string, string> = {
    activity: "Activities",
    email: "Emails",
    deal_change: "Deal Updates",
    proposal: "Proposals",
    youtube_lead: "YouTube Comments",
    note: "Notes",
  };

  return (
    <div className={cn("rounded-lg border p-3 mb-4", config.border, config.bg)}>
      <div className="flex items-center gap-2 mb-2">
        <Heart className={cn("w-4 h-4", config.color)} />
        <span className="text-xs font-semibold text-foreground">
          Relationship Health
        </span>
        <Badge
          variant="outline"
          className={cn("ml-auto text-xs", config.border, config.color)}
        >
          {config.label}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">
            {health.daysSinceContact !== null ? health.daysSinceContact : "--"}
          </p>
          <p className="text-xs text-muted-foreground">days since contact</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">
            {health.totalInteractions}
          </p>
          <p className="text-xs text-muted-foreground">total interactions</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {health.mostFrequentType
              ? typeLabels[health.mostFrequentType] ?? health.mostFrequentType
              : "--"}
          </p>
          <p className="text-xs text-muted-foreground">most frequent</p>
        </div>
      </div>
    </div>
  );
}

function QuickLogForm({
  contactId,
  onClose,
}: {
  contactId: string;
  onClose: () => void;
}) {
  const [logType, setLogType] = useState<QuickLogType>("call");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const createActivity = useCreateActivity();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await createActivity.mutateAsync({
        entity_id: contactId,
        entity_type: "contact",
        activity_type: logType,
        title: title.trim(),
        description: description.trim() || undefined,
      });
      toast.success("Activity logged");
      setTitle("");
      setDescription("");
      onClose();
    } catch {
      toast.error("Failed to log activity");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3 mb-4"
    >
      <div className="flex items-center gap-1.5">
        {QUICK_LOG_TYPES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setLogType(value)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              logType === value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={onClose}
          className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <Input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-8 text-sm"
        required
        autoFocus
      />

      <Textarea
        placeholder="Notes (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="text-sm resize-none"
      />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!title.trim() || createActivity.isPending}
        >
          {createActivity.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}

function TimelineEventItem({ event }: { event: TimelineEvent }) {
  const Icon = getIcon(event.icon);

  const relativeTime = useMemo(() => {
    try {
      return safeFormatDistanceToNow(event.timestamp, { addSuffix: true });
    } catch {
      return event.timestamp;
    }
  }, [event.timestamp]);

  return (
    <div className="relative flex gap-3 py-2.5 group">
      {/* Icon dot */}
      <div className="relative z-10 w-[30px] h-[30px] rounded-full bg-card border border-border flex items-center justify-center shrink-0">
        <Icon className={cn("w-3.5 h-3.5", event.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground">
            {event.title}
          </p>
          <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">
            {event.type === "deal_change"
              ? "Deal"
              : event.type === "youtube_lead"
                ? "YouTube"
                : event.type.charAt(0).toUpperCase() + event.type.slice(1)}
          </Badge>
        </div>
        {event.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {event.description}
          </p>
        )}
        {event.metadata?.intent && (
          <Badge variant="secondary" className="text-xs mt-1">
            Intent: {String(event.metadata.intent)}
          </Badge>
        )}
        <p className="text-xs text-muted-foreground mt-1">{relativeTime}</p>
      </div>
    </div>
  );
}

export function UnifiedTimeline({ contactId }: { contactId: string }) {
  const { data: events = [], isLoading } = useUnifiedTimeline(contactId);
  const [filter, setFilter] = useState<EventFilter>("all");
  const [showQuickLog, setShowQuickLog] = useState(false);

  const filteredEvents = useMemo(() => {
    if (filter === "all") return events;
    if (filter === "email") {
      // Include both email activities and email type events
      return events.filter(
        (e) =>
          e.type === "email" ||
          (e.type === "activity" && e.icon === "Mail")
      );
    }
    return events.filter((e) => e.type === filter);
  }, [events, filter]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-[30px] h-[30px] rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            Timeline
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setShowQuickLog(true)}
          >
            <Plus className="w-3 h-3" />
            Quick Log
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Relationship Health */}
        <RelationshipHealth events={events} />

        {/* Quick Log Form */}
        {showQuickLog && (
          <QuickLogForm
            contactId={contactId}
            onClose={() => setShowQuickLog(false)}
          />
        )}

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          <Filter className="w-3 h-3 text-muted-foreground" />
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors",
                filter === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Timeline */}
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Clock className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">
              {events.length === 0
                ? "No timeline events recorded yet."
                : "No events match the selected filter."}
            </p>
            {events.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Log an activity or interact with this contact to start the timeline.
              </p>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Vertical connecting line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

            <div className="space-y-0.5">
              {filteredEvents.map((event) => (
                <TimelineEventItem key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
