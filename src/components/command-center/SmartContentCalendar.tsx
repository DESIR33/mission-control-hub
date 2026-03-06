import { useState, useMemo } from "react";
import {
  Calendar, Plus, GripVertical, Trash2, Tag, BarChart3, Zap,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay,
} from "date-fns";
import { toast } from "sonner";
import {
  useContentCalendar,
  useContentCalendarEntries,
  useUpdateCalendarEntry,
  useCreateCalendarEntry,
  useDeleteCalendarEntry,
  type ContentCalendarEntry,
} from "@/hooks/use-content-calendar";

// ── constants ──────────────────────────────────────────────

const statusColors: Record<string, string> = {
  idea: "bg-gray-500",
  scripting: "bg-blue-500",
  filming: "bg-yellow-500",
  editing: "bg-orange-500",
  scheduled: "bg-purple-500",
  published: "bg-green-500",
};

const strategyColors: Record<string, string> = {
  growth: "border-l-green-500",
  monetization: "border-l-purple-500",
  community: "border-l-blue-500",
  evergreen: "border-l-yellow-500",
};

const contentTypeLabels: Record<string, string> = {
  long_form: "Long Form",
  short: "Short",
  livestream: "Livestream",
  premiere: "Premiere",
  community_post: "Community",
};

const contentTypeBarColors: Record<string, string> = {
  long_form: "bg-blue-500",
  short: "bg-pink-500",
  livestream: "bg-red-500",
  premiere: "bg-amber-500",
  community_post: "bg-teal-500",
};

const strategyTagOptions = ["growth", "monetization", "community", "evergreen"] as const;

const TARGET_UPLOADS_PER_WEEK = 2;

// ── helpers ────────────────────────────────────────────────

function getStrategyTag(tags: string[] | null): string | null {
  if (!tags) return null;
  return tags.find((t) => t in strategyColors) ?? null;
}

function computeMixScore(counts: Record<string, number>): number {
  const values = Object.values(counts);
  const total = values.reduce((s, v) => s + v, 0);
  if (total === 0) return 0;
  const types = Object.keys(contentTypeLabels).length;
  // Shannon-based diversity normalised to 0-100
  let entropy = 0;
  for (const v of values) {
    if (v > 0) {
      const p = v / total;
      entropy -= p * Math.log(p);
    }
  }
  const maxEntropy = Math.log(types);
  return maxEntropy > 0 ? Math.round((entropy / maxEntropy) * 100) : 0;
}

// ── component ──────────────────────────────────────────────

export function SmartContentCalendar() {
  const { data: entries = [], isLoading } = useContentCalendarEntries();
  const createEntry = useCreateCalendarEntry();
  const updateEntry = useUpdateCalendarEntry();
  const deleteEntry = useDeleteCalendarEntry();

  const [weekOffset, setWeekOffset] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    scheduled_date: "",
    content_type: "long_form" as string,
    strategy_tag: "" as string,
  });

  // ── derived data ───────────────────────────────────────

  const today = useMemo(() => new Date(), []);

  const weekDays = useMemo(() => {
    const base = addWeeks(today, weekOffset);
    const start = startOfWeek(base, { weekStartsOn: 1 });
    const end = endOfWeek(base, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [today, weekOffset]);

  const weekLabel = useMemo(() => {
    if (weekDays.length === 0) return "";
    return `${format(weekDays[0], "MMM dd")} - ${format(weekDays[weekDays.length - 1], "MMM dd, yyyy")}`;
  }, [weekDays]);

  const entriesByDay = useMemo(() => {
    const map: Record<string, ContentCalendarEntry[]> = {};
    for (const day of weekDays) {
      const key = format(day, "yyyy-MM-dd");
      map[key] = entries.filter((e) => e.scheduled_date === key);
    }
    return map;
  }, [entries, weekDays]);

  // ── content mix (this month) ───────────────────────────

  const { typeCounts, mixScore, totalThisMonth } = useMemo(() => {
    const monthStr = format(today, "yyyy-MM");
    const monthEntries = entries.filter((e) => e.scheduled_date.startsWith(monthStr));
    const counts: Record<string, number> = {};
    for (const e of monthEntries) {
      const ct = e.content_type ?? "untyped";
      counts[ct] = (counts[ct] ?? 0) + 1;
    }
    return {
      typeCounts: counts,
      mixScore: computeMixScore(counts),
      totalThisMonth: monthEntries.length,
    };
  }, [entries, today]);

  // ── publishing cadence ─────────────────────────────────

  const cadence = useMemo(() => {
    // Look at last 4 full weeks
    const fourWeeksAgo = subWeeks(today, 4);
    const recent = entries.filter(
      (e) =>
        e.status === "published" &&
        e.scheduled_date >= format(fourWeeksAgo, "yyyy-MM-dd") &&
        e.scheduled_date <= format(today, "yyyy-MM-dd"),
    );
    const perWeek = recent.length / 4;
    let label: string;
    let color: string;
    if (perWeek >= TARGET_UPLOADS_PER_WEEK - 0.25 && perWeek <= TARGET_UPLOADS_PER_WEEK + 0.5) {
      label = "on-track";
      color = "bg-green-500/15 text-green-400 border-green-500/30";
    } else if (perWeek > TARGET_UPLOADS_PER_WEEK + 0.5) {
      label = "ahead";
      color = "bg-blue-500/15 text-blue-400 border-blue-500/30";
    } else {
      label = "behind";
      color = "bg-red-500/15 text-red-400 border-red-500/30";
    }
    return { perWeek: Math.round(perWeek * 10) / 10, label, color };
  }, [entries, today]);

  // ── handlers ───────────────────────────────────────────

  const handleAdd = () => {
    if (!form.title.trim() || !form.scheduled_date) {
      toast.error("Title and date are required");
      return;
    }
    const tags: string[] = form.strategy_tag ? [form.strategy_tag] : [];
    createEntry.mutate(
      {
        title: form.title,
        scheduled_date: form.scheduled_date,
        content_type: form.content_type as ContentCalendarEntry["content_type"],
        tags: tags.length > 0 ? tags : null,
        status: "idea",
      },
      {
        onSuccess: () => {
          setForm({ title: "", scheduled_date: "", content_type: "long_form", strategy_tag: "" });
          setShowAdd(false);
          toast.success("Entry added to calendar");
        },
      },
    );
  };

  const handleDrop = (dayStr: string) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverDay(null);
    const entryId = e.dataTransfer.getData("entryId");
    if (!entryId) return;
    updateEntry.mutate(
      { id: entryId, scheduled_date: dayStr },
      { onSuccess: () => toast.success("Entry moved") },
    );
  };

  // ── loading / empty ────────────────────────────────────

  if (isLoading) {
    return <div className="rounded-lg border border-border bg-card p-6 animate-pulse h-96" />;
  }

  // ── render ─────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ─ Content Mix Score ─ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            Content Mix — {format(today, "MMMM yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {totalThisMonth === 0 ? (
            <p className="text-xs text-muted-foreground">No entries planned this month yet.</p>
          ) : (
            <>
              {/* stacked bar */}
              <div className="flex h-4 rounded-full overflow-hidden">
                {Object.entries(typeCounts).map(([type, count]) => (
                  <div
                    key={type}
                    className={`${contentTypeBarColors[type] ?? "bg-gray-500"} transition-all`}
                    style={{ width: `${(count / totalThisMonth) * 100}%` }}
                    title={`${contentTypeLabels[type] ?? type}: ${count}`}
                  />
                ))}
              </div>
              {/* legend */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(typeCounts).map(([type, count]) => (
                  <span key={type} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className={`inline-block w-2 h-2 rounded-full ${contentTypeBarColors[type] ?? "bg-gray-500"}`} />
                    {contentTypeLabels[type] ?? type}: {count}
                  </span>
                ))}
              </div>
              {/* mix score */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Mix Score:</span>
                <span className="text-sm font-bold font-mono text-foreground">{mixScore}/100</span>
                <span className="text-[10px] text-muted-foreground">
                  ({mixScore >= 70 ? "Great diversity" : mixScore >= 40 ? "Moderate diversity" : "Low diversity"})
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ─ Publishing Cadence ─ */}
      <Card>
        <CardContent className="py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-muted-foreground">Publishing Cadence</span>
            <span className="text-sm font-bold font-mono text-foreground">
              {cadence.perWeek}/week
            </span>
            <span className="text-[10px] text-muted-foreground">
              (target: {TARGET_UPLOADS_PER_WEEK}/week)
            </span>
          </div>
          <Badge variant="outline" className={`text-[10px] ${cadence.color}`}>
            {cadence.label}
          </Badge>
        </CardContent>
      </Card>

      {/* ─ Week Navigation ─ */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Prev
        </Button>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{weekLabel}</span>
          {weekOffset !== 0 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setWeekOffset(0)}>
              Today
            </Button>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* ─ Weekly Calendar Grid ─ */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-7 divide-x divide-border">
          {weekDays.map((day) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const dayEntries = entriesByDay[dayStr] ?? [];
            const isToday = isSameDay(day, today);
            const isDropTarget = dragOverDay === dayStr;

            return (
              <div
                key={dayStr}
                className={`min-h-[120px] p-1.5 transition-colors ${
                  isToday ? "bg-blue-500/5" : ""
                } ${isDropTarget ? "bg-primary/10" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverDay(dayStr);
                }}
                onDragLeave={() => setDragOverDay(null)}
                onDrop={handleDrop(dayStr)}
              >
                {/* day header */}
                <p
                  className={`text-[9px] font-mono mb-1 ${
                    isToday ? "text-blue-400 font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {format(day, "EEE")} {format(day, "dd")}
                </p>

                {/* entries */}
                {dayEntries.map((entry) => {
                  const strat = getStrategyTag(entry.tags);
                  const borderClass = strat
                    ? strategyColors[strat]
                    : "border-l-gray-500";

                  return (
                    <div
                      key={entry.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("entryId", entry.id)}
                      className={`mt-1 p-1 rounded bg-muted/50 border-l-2 ${borderClass} group cursor-grab active:cursor-grabbing`}
                    >
                      <div className="flex items-center gap-1">
                        <GripVertical className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColors[entry.status]}`} />
                        <p className="text-[8px] text-foreground truncate leading-tight">
                          {entry.title}
                        </p>
                      </div>

                      {entry.content_type && (
                        <p className="text-[7px] text-muted-foreground mt-0.5 pl-4">
                          {contentTypeLabels[entry.content_type] ?? entry.content_type}
                        </p>
                      )}

                      {strat && (
                        <div className="flex items-center gap-0.5 mt-0.5 pl-4">
                          <Tag className="w-2 h-2 text-muted-foreground" />
                          <span className="text-[7px] text-muted-foreground capitalize">{strat}</span>
                        </div>
                      )}

                      {/* hover controls */}
                      <div className="hidden group-hover:flex items-center gap-1 mt-0.5 pl-4">
                        <select
                          className="bg-transparent text-[7px] text-muted-foreground outline-none"
                          value={entry.status}
                          onChange={(e) =>
                            updateEntry.mutate({ id: entry.id, status: e.target.value as ContentCalendarEntry["status"] })
                          }
                        >
                          {Object.keys(statusColors).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <button
                          className="text-muted-foreground hover:text-red-500"
                          onClick={() =>
                            deleteEntry.mutate(entry.id, {
                              onSuccess: () => toast.success("Entry deleted"),
                            })
                          }
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─ Strategy Tag Legend ─ */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        <span className="text-[10px] text-muted-foreground">Strategy:</span>
        {strategyTagOptions.map((tag) => (
          <span key={tag} className="flex items-center gap-1 text-[10px] text-muted-foreground capitalize">
            <span className={`inline-block w-3 h-1.5 rounded-sm border-l-2 ${strategyColors[tag]}`} />
            {tag}
          </span>
        ))}
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="inline-block w-3 h-1.5 rounded-sm border-l-2 border-l-gray-500" />
          none
        </span>
      </div>

      {/* ─ Add Entry Form ─ */}
      <Card>
        <CardContent className="py-3">
          {showAdd ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="bg-muted/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border"
                  placeholder="Video title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                <input
                  className="bg-muted/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border"
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                />
                <select
                  className="bg-muted/50 rounded px-2 py-2 text-xs text-foreground border border-border outline-none"
                  value={form.content_type}
                  onChange={(e) => setForm({ ...form, content_type: e.target.value })}
                >
                  {Object.entries(contentTypeLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  className="bg-muted/50 rounded px-2 py-2 text-xs text-foreground border border-border outline-none"
                  value={form.strategy_tag}
                  onChange={(e) => setForm({ ...form, strategy_tag: e.target.value })}
                >
                  <option value="">No strategy tag</option>
                  {strategyTagOptions.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag.charAt(0).toUpperCase() + tag.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAdd} disabled={createEntry.isPending}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Entry
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" className="w-full" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Calendar Entry
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
