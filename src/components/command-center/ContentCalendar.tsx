import { useState } from "react";
import {
  Calendar, Plus, Video, Clock, Eye, Users,
  Trash2, FileText, Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useContentCalendar, useCreateCalendarEntry, useUpdateCalendarEntry, useDeleteCalendarEntry,
} from "@/hooks/use-content-calendar";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  idea: "bg-gray-500",
  scripting: "bg-blue-500",
  filming: "bg-yellow-500",
  editing: "bg-orange-500",
  scheduled: "bg-purple-500",
  published: "bg-green-500",
};

const contentTypeLabels: Record<string, string> = {
  long_form: "Long Form",
  short: "Short",
  livestream: "Livestream",
  premiere: "Premiere",
  community_post: "Community",
};

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

export function ContentCalendar() {
  const { data: calendar, isLoading } = useContentCalendar(4);
  const createEntry = useCreateCalendarEntry();
  const updateEntry = useUpdateCalendarEntry();
  const deleteEntry = useDeleteCalendarEntry();

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: "",
    scheduled_date: "",
    content_type: "long_form" as string,
    predicted_views: "",
    predicted_subs_gain: "",
    description: "",
  });

  const handleAdd = () => {
    if (!form.title.trim() || !form.scheduled_date) return;
    createEntry.mutate(
      {
        title: form.title,
        scheduled_date: form.scheduled_date,
        content_type: form.content_type as any,
        predicted_views: form.predicted_views ? Number(form.predicted_views) : null,
        predicted_subs_gain: form.predicted_subs_gain ? Number(form.predicted_subs_gain) : null,
        description: form.description || null,
        status: "idea",
      },
      {
        onSuccess: () => {
          setForm({ title: "", scheduled_date: "", content_type: "long_form", predicted_views: "", predicted_subs_gain: "", description: "" });
          setShowAdd(false);
          toast.success("Calendar entry added");
        },
      }
    );
  };

  if (isLoading) {
    return <div className="rounded-lg border border-border bg-card p-6 animate-pulse h-96" />;
  }

  if (!calendar) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Content calendar is loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Upcoming</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{calendar.upcomingCount}</p>
        </div>
        {Object.entries(calendar.statusCounts).slice(0, 3).map(([status, count]) => (
          <div key={status} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <div className={`w-2.5 h-2.5 rounded-full ${statusColors[status] ?? "bg-gray-500"}`} />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider capitalize">{status}</p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">{count}</p>
          </div>
        ))}
      </div>

      {/* Add Entry */}
      <div className="rounded-lg border border-border bg-card p-4">
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
                className="bg-muted/50 rounded px-2 py-1 text-xs text-foreground border border-border outline-none"
                value={form.content_type}
                onChange={(e) => setForm({ ...form, content_type: e.target.value })}
              >
                {Object.entries(contentTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <input
                className="bg-muted/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border"
                placeholder="Predicted views"
                type="number"
                value={form.predicted_views}
                onChange={(e) => setForm({ ...form, predicted_views: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd} disabled={createEntry.isPending}>Add</Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="w-full" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Calendar Entry
          </Button>
        )}
      </div>

      {/* Weekly Calendar */}
      {calendar.weeks.map((week) => (
        <div key={week.startDate} className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">{week.weekLabel}</p>
            {week.totalPredictedViews > 0 && (
              <p className="text-[10px] text-muted-foreground">
                ~{fmtCount(week.totalPredictedViews)} predicted views
              </p>
            )}
          </div>
          <div className="grid grid-cols-7 divide-x divide-border">
            {week.days.map((day) => (
              <div
                key={day.date}
                className={`min-h-[80px] p-1.5 ${day.isToday ? "bg-blue-500/5" : ""}`}
              >
                <p className={`text-[9px] font-mono ${day.isToday ? "text-blue-400 font-semibold" : "text-muted-foreground"}`}>
                  {day.dayName} {day.date.split("-")[2]}
                </p>
                {day.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="mt-1 p-1 rounded bg-muted/50 group"
                  >
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColors[entry.status]}`} />
                      <p className="text-[8px] text-foreground truncate">{entry.title}</p>
                    </div>
                    {entry.content_type && (
                      <p className="text-[7px] text-muted-foreground mt-0.5">
                        {contentTypeLabels[entry.content_type] ?? entry.content_type}
                      </p>
                    )}
                    <div className="hidden group-hover:flex items-center gap-1 mt-0.5">
                      <select
                        className="bg-transparent text-[7px] text-muted-foreground outline-none"
                        value={entry.status}
                        onChange={(e) =>
                          updateEntry.mutate({ id: entry.id, status: e.target.value as any })
                        }
                      >
                        {Object.keys(statusColors).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <button
                        className="text-muted-foreground hover:text-red-500"
                        onClick={() => deleteEntry.mutate(entry.id)}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
