import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, Film } from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay,
  format, isToday, differenceInCalendarWeeks,
} from "date-fns";
import { cn } from "@/lib/utils";
import { useUpdateVideo, type VideoQueueItem } from "@/hooks/use-video-queue";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<VideoQueueItem["status"], string> = {
  idea: "bg-slate-500",
  scripting: "bg-blue-500",
  recording: "bg-amber-500",
  editing: "bg-orange-500",
  scheduled: "bg-purple-500",
  published: "bg-emerald-500",
};

interface ContentCalendarProps {
  videos: VideoQueueItem[];
  onSelectVideo: (video: VideoQueueItem) => void;
}

export function ContentCalendar({ videos, onSelectVideo }: ContentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { toast } = useToast();
  const updateVideo = useUpdateVideo();

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  // Map videos to dates
  const videosByDate = useMemo(() => {
    const map: Record<string, VideoQueueItem[]> = {};
    for (const video of videos) {
      if (video.targetPublishDate) {
        const key = format(new Date(video.targetPublishDate), "yyyy-MM-dd");
        if (!map[key]) map[key] = [];
        map[key].push(video);
      }
    }
    return map;
  }, [videos]);

  // Unscheduled videos
  const unscheduled = useMemo(
    () => videos.filter((v) => !v.targetPublishDate),
    [videos]
  );

  // Publishing streak: count consecutive weeks with at least 1 published/scheduled video
  const publishingStreak = useMemo(() => {
    const scheduledDates = videos
      .filter((v) => v.targetPublishDate && (v.status === "published" || v.status === "scheduled"))
      .map((v) => new Date(v.targetPublishDate!))
      .sort((a, b) => b.getTime() - a.getTime());

    if (scheduledDates.length === 0) return 0;

    let streak = 1;
    const now = new Date();
    const currentWeek = differenceInCalendarWeeks(now, new Date(2020, 0, 1));

    const weekSet = new Set(
      scheduledDates.map((d) => differenceInCalendarWeeks(d, new Date(2020, 0, 1)))
    );

    let checkWeek = currentWeek;
    if (!weekSet.has(checkWeek)) checkWeek--;
    if (!weekSet.has(checkWeek)) return 0;

    streak = 1;
    for (let w = checkWeek - 1; ; w--) {
      if (weekSet.has(w)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [videos]);

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    const videoId = e.dataTransfer.getData("text/plain");
    if (!videoId) return;

    updateVideo.mutate(
      { id: videoId, targetPublishDate: format(targetDate, "yyyy-MM-dd") },
      {
        onSuccess: () => toast({ title: "Video rescheduled" }),
        onError: () => toast({ title: "Failed to reschedule", variant: "destructive" }),
      }
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragStart = (e: React.DragEvent, videoId: string) => {
    e.dataTransfer.setData("text/plain", videoId);
    e.dataTransfer.effectAllowed = "move";
  };

  // Check which days have no content this month
  const hasContentOnDay = (day: Date) => {
    const key = format(day, "yyyy-MM-dd");
    return (videosByDate[key]?.length ?? 0) > 0;
  };

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex gap-4 h-full">
      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Month nav + streak */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 rounded hover:bg-accent text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="text-sm font-semibold text-foreground min-w-[120px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 rounded hover:bg-accent text-muted-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <Flame className={cn("h-3.5 w-3.5", publishingStreak > 0 ? "text-orange-500" : "text-muted-foreground")} />
            <span className="text-foreground font-semibold">{publishingStreak}</span>
            <span className="text-muted-foreground">week streak</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-3">
          {(Object.entries(statusColors) as [VideoQueueItem["status"], string][]).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1">
              <span className={cn("w-2 h-2 rounded-full", color)} />
              <span className="text-[10px] text-muted-foreground capitalize">{status}</span>
            </div>
          ))}
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {weekdays.map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 flex-1 gap-px bg-border rounded-lg overflow-hidden">
          {calendarDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayVideos = videosByDate[key] ?? [];
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);
            const isWeekday = day.getDay() !== 0 && day.getDay() !== 6;
            const noContent = inMonth && isWeekday && !hasContentOnDay(day);

            return (
              <div
                key={key}
                className={cn(
                  "bg-card p-1 min-h-[80px] transition-colors",
                  !inMonth && "bg-muted/30",
                  today && "ring-1 ring-primary ring-inset",
                  noContent && inMonth && "bg-red-500/5"
                )}
                onDrop={(e) => handleDrop(e, day)}
                onDragOver={handleDragOver}
              >
                <div className={cn(
                  "text-[11px] font-medium mb-0.5",
                  today ? "text-primary font-bold" : inMonth ? "text-foreground" : "text-muted-foreground/50"
                )}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayVideos.slice(0, 3).map((v) => (
                    <div
                      key={v.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, v.id)}
                      onClick={() => onSelectVideo(v)}
                      className={cn(
                        "text-[10px] px-1 py-0.5 rounded truncate cursor-pointer text-white font-medium",
                        statusColors[v.status]
                      )}
                      title={v.title}
                    >
                      {v.title}
                    </div>
                  ))}
                  {dayVideos.length > 3 && (
                    <div className="text-[10px] text-muted-foreground px-1">
                      +{dayVideos.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unscheduled sidebar */}
      <div className="w-48 shrink-0 flex flex-col min-h-0">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Unscheduled ({unscheduled.length})
        </h4>
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {unscheduled.length === 0 ? (
            <p className="text-xs text-muted-foreground">All videos scheduled!</p>
          ) : (
            unscheduled.map((v) => (
              <div
                key={v.id}
                draggable
                onDragStart={(e) => handleDragStart(e, v.id)}
                onClick={() => onSelectVideo(v)}
                className="rounded-lg border border-border bg-card p-2 cursor-grab active:cursor-grabbing hover:bg-muted/20"
              >
                <div className="flex items-center gap-1 mb-1">
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusColors[v.status])} />
                  <span className="text-[10px] text-muted-foreground capitalize">{v.status}</span>
                </div>
                <p className="text-xs text-foreground font-medium truncate">{v.title}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
