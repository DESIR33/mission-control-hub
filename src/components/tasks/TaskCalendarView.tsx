import { useMemo, useState, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  differenceInCalendarDays,
  addDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  max as dateMax,
  min as dateMin,
  getDay,
  isWeekend,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/use-tasks";
import { useNavigate } from "react-router-dom";
import type { Task } from "@/types/tasks";

type CalendarMode = "month" | "week" | "workweek";

interface TaskCalendarViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

interface TaskSegment {
  taskId: string;
  task: Task;
  startCol: number;
  span: number;
  isStart: boolean;
  isEnd: boolean;
}

interface WeekRow {
  days: Date[];
  lanes: (TaskSegment | null)[][];
  overflowByDay: number[];
}

const MAX_LANES = 3;

function getTaskDateRange(task: Task): { start: Date; end: Date } | null {
  if (task.start_date && task.due_date) {
    return { start: new Date(task.start_date), end: new Date(task.due_date) };
  }
  if (task.due_date) {
    const d = new Date(task.due_date);
    return { start: d, end: d };
  }
  if (task.start_date) {
    const d = new Date(task.start_date);
    return { start: d, end: d };
  }
  return null;
}

function getBarClasses(task: Task): string {
  const colors: Record<string, string> = {
    urgent:
      "bg-red-100 dark:bg-red-950/40 border-l-red-500 text-red-900 dark:text-red-200",
    high: "bg-orange-100 dark:bg-orange-950/40 border-l-orange-500 text-orange-900 dark:text-orange-200",
    medium:
      "bg-blue-100 dark:bg-blue-950/40 border-l-blue-500 text-blue-900 dark:text-blue-200",
    low: "bg-green-100 dark:bg-green-950/40 border-l-green-500 text-green-900 dark:text-green-200",
  };
  return colors[task.priority] || colors.medium;
}

function buildWeekRows(
  weeks: Date[][],
  tasks: Task[],
  _gridStart: Date,
  _gridEnd: Date,
  colCount: number
): WeekRow[] {
  const taskRanges = tasks
    .map((task) => {
      const range = getTaskDateRange(task);
      if (!range) return null;
      return { task, ...range };
    })
    .filter(Boolean) as { task: Task; start: Date; end: Date }[];

  return weeks.map((days) => {
    const weekStart = days[0];
    const weekEnd = days[days.length - 1];

    const segments: TaskSegment[] = [];
    for (const { task, start, end } of taskRanges) {
      const segStart = dateMax([start, weekStart]);
      const segEnd = dateMin([end, weekEnd]);
      if (segStart > segEnd) continue;

      const startCol = differenceInCalendarDays(segStart, weekStart);
      const endCol = differenceInCalendarDays(segEnd, weekStart);
      if (startCol >= colCount || endCol < 0) continue;
      const clampedStart = Math.max(0, startCol);
      const clampedEnd = Math.min(colCount - 1, endCol);
      segments.push({
        taskId: task.id,
        task,
        startCol: clampedStart,
        span: clampedEnd - clampedStart + 1,
        isStart: isSameDay(segStart, start),
        isEnd: isSameDay(segEnd, end),
      });
    }

    segments.sort((a, b) => a.startCol - b.startCol || b.span - a.span);

    const lanes: (TaskSegment | null)[][] = [];
    const placed = new Set<string>();

    for (const seg of segments) {
      let assigned = false;
      for (let li = 0; li < lanes.length && li < MAX_LANES; li++) {
        let fits = true;
        for (let c = seg.startCol; c < seg.startCol + seg.span; c++) {
          if (lanes[li][c] !== null) {
            fits = false;
            break;
          }
        }
        if (fits) {
          for (let c = seg.startCol; c < seg.startCol + seg.span; c++) {
            lanes[li][c] = seg;
          }
          placed.add(seg.taskId);
          assigned = true;
          break;
        }
      }
      if (!assigned && lanes.length < MAX_LANES) {
        const newLane: (TaskSegment | null)[] = Array(colCount).fill(null);
        for (let c = seg.startCol; c < seg.startCol + seg.span; c++) {
          newLane[c] = seg;
        }
        lanes.push(newLane);
        placed.add(seg.taskId);
      }
    }

    const overflowByDay = Array(colCount).fill(0);
    for (const seg of segments) {
      if (!placed.has(seg.taskId)) {
        for (let c = seg.startCol; c < seg.startCol + seg.span; c++) {
          overflowByDay[c]++;
        }
      }
    }

    return { days, lanes, overflowByDay };
  });
}

function renderLane(
  lane: (TaskSegment | null)[],
  colCount: number,
  onTaskClick: (id: string) => void
): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let col = 0;
  while (col < colCount) {
    const seg = lane[col];
    if (seg) {
      elements.push(
        <div
          key={`${seg.taskId}-${col}`}
          className={cn(
            "h-[22px] mx-0.5 flex items-center px-1.5 text-[11px] leading-tight cursor-pointer truncate border-l-2",
            getBarClasses(seg.task),
            seg.isStart && "rounded-l",
            seg.isEnd && "rounded-r",
            seg.task.status === "done" && "opacity-50 line-through"
          )}
          style={{ gridColumn: `${col + 1} / span ${seg.span}` }}
          onClick={(e) => {
            e.stopPropagation();
            onTaskClick(seg.taskId);
          }}
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData("taskId", seg.taskId);
          }}
          title={seg.task.title}
        >
          <span className="truncate">{seg.task.title}</span>
        </div>
      );
      col += seg.span;
    } else {
      let emptyStart = col;
      while (col < colCount && !lane[col]) col++;
      elements.push(
        <div
          key={`empty-${emptyStart}`}
          style={{ gridColumn: `${emptyStart + 1} / span ${col - emptyStart}` }}
        />
      );
    }
  }
  return elements;
}

export function TaskCalendarView({ tasks, onTaskClick }: TaskCalendarViewProps) {
  const [mode, setMode] = useState<CalendarMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const { updateTask, createTask } = useTasks();
  const navigate = useNavigate();

  const goForward = () => {
    if (mode === "month") setCurrentDate((d) => addMonths(d, 1));
    else setCurrentDate((d) => addWeeks(d, 1));
  };
  const goBack = () => {
    if (mode === "month") setCurrentDate((d) => subMonths(d, 1));
    else setCurrentDate((d) => subWeeks(d, 1));
  };
  const goToday = () => setCurrentDate(new Date());

  const handleDoubleClickDay = useCallback(
    (day: Date) => {
      createTask.mutate(
        {
          title: "New task",
          due_date: day.toISOString(),
          status: "todo",
          priority: "medium",
        } as any,
        {
          onSuccess: (data: any) => {
            if (data?.id) navigate(`/tasks/${data.id}`);
          },
        }
      );
    },
    [createTask, navigate]
  );

  const { weeks, dayNames, colCount, headerText } = useMemo(() => {
    if (mode === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const gStart = startOfWeek(monthStart, { weekStartsOn: 0 });
      let gEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
      const allDays = eachDayOfInterval({ start: gStart, end: gEnd });
      if (allDays.length < 42) {
        gEnd = addDays(gEnd, 42 - allDays.length);
        const extra = eachDayOfInterval({ start: addDays(allDays[allDays.length - 1], 1), end: gEnd });
        allDays.push(...extra);
      }
      const wks: Date[][] = [];
      for (let i = 0; i < allDays.length; i += 7) wks.push(allDays.slice(i, i + 7));
      return {
        weeks: wks,
        dayNames: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        colCount: 7,
        headerText: format(currentDate, "MMMM yyyy"),
      };
    }

    // Week or workweek
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    if (mode === "week") {
      const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
      return {
        weeks: [days],
        dayNames: days.map((d) => format(d, "EEE dd")),
        colCount: 7,
        headerText: `${format(days[0], "MMM dd")} – ${format(days[6], "MMM dd, yyyy")}`,
      };
    }

    // Workweek: Mon–Fri
    const monday = addDays(weekStart, 1);
    const friday = addDays(weekStart, 5);
    const days = eachDayOfInterval({ start: monday, end: friday });
    return {
      weeks: [days],
      dayNames: days.map((d) => format(d, "EEE dd")),
      colCount: 5,
      headerText: `${format(days[0], "MMM dd")} – ${format(days[4], "MMM dd, yyyy")}`,
    };
  }, [currentDate, mode]);

  const weekRows = useMemo(
    () => buildWeekRows(weeks, tasks, weeks[0]?.[0] ?? new Date(), weeks[weeks.length - 1]?.[weeks[weeks.length - 1].length - 1] ?? new Date(), colCount),
    [weeks, tasks, colCount]
  );

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updates: Record<string, any> = { id: taskId };
    if (task.start_date && task.due_date) {
      const oldStart = new Date(task.start_date);
      const oldEnd = new Date(task.due_date);
      const duration = differenceInCalendarDays(oldEnd, oldStart);
      updates.start_date = targetDate.toISOString();
      updates.due_date = addDays(targetDate, duration).toISOString();
    } else if (task.due_date) {
      updates.due_date = targetDate.toISOString();
    } else if (task.start_date) {
      updates.start_date = targetDate.toISOString();
    }
    updateTask.mutate(updates as any);
  };

  const isMonthMode = mode === "month";
  const gridColsClass = colCount === 5 ? "grid-cols-5" : "grid-cols-7";

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goForward}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">{headerText}</h3>
        </div>

        {/* View mode switcher */}
        <div className="flex items-center bg-muted rounded-md p-0.5 gap-0.5">
          {([
            { id: "month" as CalendarMode, label: "Month" },
            { id: "week" as CalendarMode, label: "Week" },
            { id: "workweek" as CalendarMode, label: "Work Week" },
          ]).map((v) => (
            <button
              key={v.id}
              onClick={() => setMode(v.id)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded transition-colors",
                mode === v.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border border-border rounded-md overflow-hidden">
        {/* Day-of-week header */}
        <div className={cn("grid bg-muted/40", gridColsClass)}>
          {dayNames.map((d, i) => (
            <div
              key={i}
              className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-r border-border last:border-r-0"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Week rows */}
        {weekRows.map((week, wi) => (
          <div key={wi} className="border-t border-border">
            {/* Day numbers */}
            <div className={cn("grid", gridColsClass)}>
              {week.days.map((day, di) => {
                const inMonth = isMonthMode ? isSameMonth(day, currentDate) : true;
                const today = isToday(day);
                return (
                  <div
                    key={di}
                    className={cn(
                      "px-2 pt-1.5 pb-1 border-r border-border last:border-r-0 relative cursor-default",
                      !inMonth && "bg-muted/30",
                      !isMonthMode && isWeekend(day) && "bg-muted/20"
                    )}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, day)}
                    onDoubleClick={() => handleDoubleClickDay(day)}
                  >
                    <span
                      className={cn(
                        "text-xs leading-none",
                        !inMonth && "text-muted-foreground/40",
                        today &&
                          "bg-primary text-primary-foreground rounded-full w-6 h-6 inline-flex items-center justify-center font-semibold",
                        !today && inMonth && "font-medium"
                      )}
                    >
                      {isMonthMode ? day.getDate() : format(day, "d")}
                    </span>
                    {today && (
                      <div className="absolute top-0 left-0 w-0.5 h-full bg-primary" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Lane rows (task bars) */}
            {week.lanes.map((lane, li) => (
              <div key={li} className={cn("grid min-h-[26px] items-center", gridColsClass)}>
                {renderLane(lane, colCount, onTaskClick)}
              </div>
            ))}

            {/* Overflow indicators */}
            {week.overflowByDay.some((n) => n > 0) && (
              <div className={cn("grid min-h-[18px]", gridColsClass)}>
                {week.overflowByDay.map((count, di) => (
                  <div
                    key={di}
                    className="border-r border-border last:border-r-0 px-2"
                  >
                    {count > 0 && (
                      <span className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                        +{count} more
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Minimum height filler for empty weeks */}
            {week.lanes.length === 0 && (
              <div className={cn("grid", gridColsClass, isMonthMode ? "min-h-[52px]" : "min-h-[120px]")}>
                {week.days.map((day, di) => (
                  <div
                    key={di}
                    className={cn(
                      "border-r border-border last:border-r-0",
                      isMonthMode && !isSameMonth(day, currentDate) && "bg-muted/30"
                    )}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, day)}
                    onDoubleClick={() => handleDoubleClickDay(day)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
