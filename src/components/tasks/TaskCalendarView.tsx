import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isPast, isToday as isDateToday, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Circle, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/use-tasks";
import type { Task } from "@/types/tasks";

interface TaskCalendarViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

export function TaskCalendarView({ tasks, onTaskClick }: TaskCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      if (t.due_date) {
        const key = format(new Date(t.due_date), "yyyy-MM-dd");
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    });
    return map;
  }, [tasks]);

  const selectedTasks = selectedDate
    ? tasksByDate[format(selectedDate, "yyyy-MM-dd")] || []
    : [];

  const prevMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const { updateTask } = useTasks();

  // Pad start with empty cells for day of week alignment
  const startDow = days[0].getDay();

  const priorityDot: Record<string, string> = {
    urgent: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-green-500",
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      updateTask.mutate({ id: taskId, due_date: targetDate.toISOString() });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
        <h3 className="text-sm font-semibold">{format(currentMonth, "MMMM yyyy")}</h3>
        <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-7 gap-px">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
        ))}
        {Array.from({ length: startDow }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDate[key] || [];
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={key}
              onClick={() => setSelectedDate(day)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, day)}
              className={cn(
                "min-h-[80px] sm:min-h-[100px] flex flex-col rounded-lg text-sm transition-colors p-1 cursor-pointer border",
                isSelected ? "bg-primary/10 border-primary" : "hover:bg-accent border-transparent",
                isToday && !isSelected && "ring-1 ring-primary"
              )}
            >
              <span className={cn(
                "text-xs font-medium mb-0.5 self-end px-1 rounded",
                isToday && "bg-primary text-primary-foreground"
              )}>
                {day.getDate()}
              </span>
              <div className="flex-1 space-y-0.5 overflow-hidden">
                {dayTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData("taskId", task.id); }}
                    onClick={(e) => { e.stopPropagation(); onTaskClick(task.id); }}
                    className={cn(
                      "flex items-center gap-1 px-1 py-0.5 rounded text-[10px] leading-tight truncate cursor-pointer hover:bg-accent/80",
                      task.status === "done" ? "opacity-50 line-through" : ""
                    )}
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityDot[task.priority])} />
                    <span className="truncate">{task.title}</span>
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <span className="text-[10px] text-muted-foreground px-1">+{dayTasks.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="border-t pt-4 space-y-2">
          <h4 className="text-sm font-medium">{format(selectedDate, "EEEE, MMMM d")}</h4>
          {selectedTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tasks due this day</p>
          ) : (
            selectedTasks.map((task) => {
              const overdue = task.status !== "done" && task.status !== "cancelled" && isPast(startOfDay(new Date(task.due_date!))) && !isDateToday(new Date(task.due_date!));
              return (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("taskId", task.id)}
                  onClick={() => onTaskClick(task.id)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-accent/50 cursor-pointer text-sm",
                    overdue && "border-red-500/30"
                  )}
                >
                  {task.status === "done" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : overdue ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  <span className={cn(task.status === "done" && "line-through opacity-60")}>{task.title}</span>
                  {overdue && <span className="text-[10px] text-red-500 ml-auto">Overdue</span>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
