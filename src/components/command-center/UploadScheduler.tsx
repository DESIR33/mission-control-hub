import { useMemo } from "react";
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Star,
  Calendar,
  BarChart3,
  Lightbulb,
  Zap,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useUploadTimeAnalysis,
  type TimeSlot,
} from "@/hooks/use-upload-time-analysis";

const DAYS_ORDER = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const DAYS_SHORT: Record<string, string> = {
  Sunday: "Sun",
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
};

const TIME_BLOCKS = [
  { start: 0, label: "12-3 AM" },
  { start: 3, label: "3-6 AM" },
  { start: 6, label: "6-9 AM" },
  { start: 9, label: "9-12 PM" },
  { start: 12, label: "12-3 PM" },
  { start: 15, label: "3-6 PM" },
  { start: 18, label: "6-9 PM" },
  { start: 21, label: "9-12 AM" },
];

function scoreColorClass(score: number): string {
  if (score >= 81) return "bg-red-100 dark:bg-red-500/30 text-red-800 dark:text-red-200";
  if (score >= 61) return "bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-200";
  if (score >= 41) return "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-200";
  if (score >= 21) return "bg-blue-100 dark:bg-blue-500/10 text-blue-800 dark:text-blue-200";
  return "bg-slate-100 dark:bg-slate-500/10 text-slate-500 dark:text-slate-400";
}

function hourLabel(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

/** Compute the next N optimal publish windows from now. */
function getNextOptimalWindows(topSlots: TimeSlot[], count: number): { day: string; time: string; score: number }[] {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();

  const windows: { day: string; time: string; score: number; daysAhead: number; hour: number }[] = [];

  for (const slot of topSlots) {
    const slotDayIndex = DAYS_ORDER.indexOf(slot.dayOfWeek);
    if (slotDayIndex < 0) continue;

    // Calculate how many days ahead this slot is
    let daysAhead = slotDayIndex - currentDay;
    if (daysAhead < 0) daysAhead += 7;
    if (daysAhead === 0 && slot.hour <= currentHour) daysAhead = 7;

    windows.push({
      day: slot.dayOfWeek,
      time: hourLabel(slot.hour),
      score: slot.score,
      daysAhead,
      hour: slot.hour,
    });

    // Also add next week's instance if needed
    windows.push({
      day: slot.dayOfWeek,
      time: hourLabel(slot.hour),
      score: slot.score,
      daysAhead: daysAhead + 7,
      hour: slot.hour,
    });
  }

  windows.sort((a, b) => a.daysAhead - b.daysAhead || b.score - a.score);

  const unique: typeof windows = [];
  const seen = new Set<string>();
  for (const w of windows) {
    const key = `${w.daysAhead}-${w.hour}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(w);
    }
    if (unique.length >= count) break;
  }

  return unique.map((w) => {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + w.daysAhead);
    const dayLabel = w.daysAhead === 0
      ? "Today"
      : w.daysAhead === 1
        ? "Tomorrow"
        : `${w.day} (${targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;

    return { day: dayLabel, time: w.time, score: w.score };
  });
}

export function UploadScheduler() {
  const { data: analysis, isLoading } = useUploadTimeAnalysis();

  const avgOptimalViews = useMemo(() => {
    if (!analysis) return 0;
    const top = analysis.topSlots;
    if (!top.length) return 0;
    return Math.round(top.reduce((s, t) => s + t.avgViews, 0) / top.length);
  }, [analysis]);

  const avgNonOptimalViews = useMemo(() => {
    if (!analysis) return 0;
    const worst = analysis.worstSlots;
    if (!worst.length) return 0;
    return Math.round(worst.reduce((s, t) => s + t.avgViews, 0) / worst.length);
  }, [analysis]);

  const nextWindows = useMemo(() => {
    if (!analysis) return [];
    return getNextOptimalWindows(analysis.topSlots, 3);
  }, [analysis]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Clock className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">
            Not enough video data to analyze optimal upload times.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload more videos with publish dates to unlock scheduling insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Best Time Hero */}
      <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
              <Star className="w-7 h-7 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">
                Best Upload Window
              </p>
              <p className="text-2xl font-bold text-foreground">
                {analysis.bestTimeLabel}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant="secondary"
                  className="bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30"
                >
                  Score: {analysis.bestScore}/100
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {analysis.topSlots[0]?.videoCount ?? 0} videos analyzed
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {analysis.recommendation}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Heatmap Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            Upload Time Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: "56px repeat(8, 1fr)", minWidth: 500 }}
            >
              {/* Header row */}
              <div />
              {TIME_BLOCKS.map((block) => (
                <div
                  key={block.start}
                  className="text-[9px] text-muted-foreground text-center truncate px-0.5"
                >
                  {block.label}
                </div>
              ))}

              {/* Day rows */}
              {DAYS_ORDER.map((day) => {
                const daySlots = analysis.heatmap.filter(
                  (s) => s.dayOfWeek === day
                );
                return (
                  <div key={day} className="contents">
                    <div className="text-[10px] text-muted-foreground flex items-center font-medium">
                      {DAYS_SHORT[day]}
                    </div>
                    {TIME_BLOCKS.map((block) => {
                      const slot = daySlots.find(
                        (s) => s.hour >= block.start && s.hour < block.start + 3
                      );
                      const score = slot?.score ?? 0;
                      return (
                        <div
                          key={block.start}
                          className={cn(
                            "h-8 rounded-sm flex items-center justify-center transition-colors cursor-default",
                            scoreColorClass(score)
                          )}
                          title={
                            slot && slot.videoCount > 0
                              ? `${slot.label}: Score ${slot.score}, ${Math.round(slot.avgViews).toLocaleString()} avg views, ${slot.avgCtr.toFixed(1)}% CTR`
                              : `${DAYS_SHORT[day]} ${block.label}: No data`
                          }
                        >
                          {score > 0 && (
                            <span className="text-[9px] font-mono font-medium">
                              {score}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 justify-end">
            <span className="text-[9px] text-muted-foreground">Cold</span>
            <div className="flex gap-0.5">
              <div className="w-5 h-2.5 rounded-sm bg-slate-100 dark:bg-slate-500/10" />
              <div className="w-5 h-2.5 rounded-sm bg-blue-100 dark:bg-blue-500/10" />
              <div className="w-5 h-2.5 rounded-sm bg-yellow-100 dark:bg-yellow-500/20" />
              <div className="w-5 h-2.5 rounded-sm bg-orange-100 dark:bg-orange-500/20" />
              <div className="w-5 h-2.5 rounded-sm bg-red-100 dark:bg-red-500/30" />
            </div>
            <span className="text-[9px] text-muted-foreground">Hot</span>
          </div>
        </CardContent>
      </Card>

      {/* Top 5 and Worst 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 5 Upload Slots */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Top 5 Upload Slots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.topSlots.map((slot, i) => (
                <div
                  key={`${slot.dayOfWeek}-${slot.hour}`}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Badge
                      variant={i === 0 ? "default" : "secondary"}
                      className={cn(
                        "text-[10px] font-mono shrink-0 w-6 justify-center",
                        i === 0 && "bg-green-600"
                      )}
                    >
                      {i + 1}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {slot.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {slot.videoCount} video{slot.videoCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono text-foreground">
                      {Math.round(slot.avgViews).toLocaleString()} views
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {slot.avgCtr.toFixed(1)}% CTR
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Worst 3 Slots */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              Worst 3 Slots (Avoid)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.worstSlots.map((slot, i) => (
                <div
                  key={`${slot.dayOfWeek}-${slot.hour}`}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-mono text-red-500">
                        {i + 1}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {slot.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Score: {slot.score}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono text-muted-foreground">
                      {Math.round(slot.avgViews).toLocaleString()} views
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {slot.avgCtr.toFixed(1)}% CTR
                    </p>
                  </div>
                </div>
              ))}

              {analysis.worstSlots.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No underperforming slots detected yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Publishing Insights */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            Publishing Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border bg-secondary/30 p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                Best Day
              </p>
              <p className="text-lg font-bold text-foreground">
                {analysis.bestDay}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                Best Time
              </p>
              <p className="text-lg font-bold text-foreground">
                {hourLabel(analysis.bestHour)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                Optimal vs Non-Optimal
              </p>
              <p className="text-lg font-bold text-foreground">
                {avgOptimalViews.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground">
                  {" "}vs{" "}
                </span>
                {avgNonOptimalViews.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">avg views</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-suggest: Next 3 Optimal Windows */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Suggested Publish Windows
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Next optimal times for your content queue based on historical performance.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {nextWindows.map((window, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg border p-4 text-center transition-colors",
                  i === 0
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-border bg-secondary/30"
                )}
              >
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <BarChart3
                    className={cn(
                      "w-3.5 h-3.5",
                      i === 0 ? "text-green-500" : "text-muted-foreground"
                    )}
                  />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Window {i + 1}
                  </span>
                </div>
                <p className="text-sm font-bold text-foreground">{window.day}</p>
                <p className="text-base font-semibold text-foreground mt-0.5">
                  {window.time}
                </p>
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-2 text-[10px]",
                    i === 0 && "border-green-500/30 text-green-600 dark:text-green-400"
                  )}
                >
                  Score: {window.score}
                </Badge>
              </div>
            ))}

            {nextWindows.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 col-span-3">
                Not enough data to suggest publish windows.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
