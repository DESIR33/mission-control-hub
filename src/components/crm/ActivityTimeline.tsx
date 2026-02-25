import { useState, useMemo } from "react";
import { Mail, Phone, Video, FileText, Linkedin, Twitter, Instagram, MessageSquare, ArrowRightLeft, CheckCircle2, MoreHorizontal, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Activity } from "@/types/crm";
import { format, startOfDay, subDays, isAfter } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateActivity } from "@/hooks/use-contacts";
import { toast } from "sonner";

const LOGGABLE_TYPES = [
  { value: "call", label: "Call", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Meeting", icon: Video },
  { value: "note", label: "Note", icon: FileText },
] as const;

type LoggableType = typeof LOGGABLE_TYPES[number]["value"];

const activityIcons: Record<string, { icon: typeof Mail; color: string }> = {
  email: { icon: Mail, color: "text-primary" },
  call: { icon: Phone, color: "text-success" },
  meeting: { icon: Video, color: "text-chart-4" },
  note: { icon: FileText, color: "text-muted-foreground" },
  linkedin: { icon: Linkedin, color: "text-primary" },
  twitter: { icon: Twitter, color: "text-primary" },
  instagram: { icon: Instagram, color: "text-warning" },
  message: { icon: MessageSquare, color: "text-primary" },
  deal_stage_change: { icon: ArrowRightLeft, color: "text-warning" },
  task_completed: { icon: CheckCircle2, color: "text-success" },
  other: { icon: MoreHorizontal, color: "text-muted-foreground" },
  post_engagement: { icon: MessageSquare, color: "text-chart-4" },
};

const DATE_FILTERS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
] as const;

type DateFilterValue = typeof DATE_FILTERS[number]["value"];
type TypeFilterValue = "all" | "call" | "email" | "meeting" | "note";

const TYPE_FILTERS: { value: TypeFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "note", label: "Note" },
];

interface ActivityTimelineProps {
  activities: Activity[];
  contactId: string;
  entityType?: string;
}

export function ActivityTimeline({ activities, contactId, entityType = "contact" }: ActivityTimelineProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<LoggableType>("call");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilterValue>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");

  const createActivity = useCreateActivity();

  const filtered = useMemo(() => {
    let result = activities;

    if (typeFilter !== "all") {
      result = result.filter((a) => a.activity_type === typeFilter);
    }

    if (dateFilter !== "all") {
      const cutoff =
        dateFilter === "today"
          ? startOfDay(new Date())
          : dateFilter === "7d"
          ? subDays(new Date(), 7)
          : subDays(new Date(), 30);
      result = result.filter((a) => isAfter(new Date(a.performed_at), cutoff));
    }

    return result;
  }, [activities, typeFilter, dateFilter]);

  function openForm(type: LoggableType) {
    setSelectedType(type);
    setTitle("");
    setDescription("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createActivity.mutateAsync({
        entity_id: contactId,
        entity_type: entityType,
        activity_type: selectedType,
        title: title.trim(),
        description: description.trim() || undefined,
      });
      toast.success("Activity logged");
      setTitle("");
      setDescription("");
      setShowForm(false);
    } catch {
      toast.error("Failed to log activity");
    }
  }

  return (
    <div className="space-y-4">
      {/* Log activity */}
      {!showForm ? (
        <div className="flex gap-1.5 flex-wrap">
          {LOGGABLE_TYPES.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => openForm(value)}
            >
              <Icon className="w-3 h-3" />
              {label}
            </Button>
          ))}
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3"
        >
          {/* Type tabs */}
          <div className="flex items-center gap-1.5">
            {LOGGABLE_TYPES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedType(value)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  selectedType === value
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
              onClick={() => setShowForm(false)}
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!title.trim() || createActivity.isPending}
            >
              {createActivity.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {TYPE_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize transition-colors",
                typeFilter === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Select
          value={dateFilter}
          onValueChange={(v) => setDateFilter(v as DateFilterValue)}
        >
          <SelectTrigger className="h-6 w-auto text-[11px] px-2 ml-auto border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value} className="text-xs">
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          {activities.length === 0
            ? "No activity recorded yet"
            : "No activities match the filters"}
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-1">
            {filtered.map((activity) => {
              const config = activityIcons[activity.activity_type] ?? activityIcons.other;
              const Icon = config.icon;

              return (
                <div key={activity.id} className="relative flex gap-3 py-2.5 group">
                  {/* Icon dot */}
                  <div className="relative z-10 w-[30px] h-[30px] rounded-full bg-card border border-border flex items-center justify-center shrink-0">
                    <Icon className={cn("w-3.5 h-3.5", config.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-baseline gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {activity.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">
                        {activity.activity_type.replace(/_/g, " ")}
                      </span>
                    </div>
                    {activity.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {activity.description}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(activity.performed_at), "MMM d, yyyy · h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
