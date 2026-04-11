import { memo } from "react";
import { CalendarClock, ArrowRight, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isToday, isTomorrow, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useUpcomingTasks } from "@/hooks/use-upcoming-tasks";
import { safeDate, safeFormat } from "@/lib/date-utils";

const priorityDot: Record<string, string> = {
  urgent: "bg-destructive",
  high: "bg-warning",
  medium: "bg-primary",
  low: "bg-muted-foreground",
};

function getTaskDueDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? `${dateStr}T12:00:00`
    : dateStr;

  return safeDate(normalized);
}

function dueDateLabel(dateStr: string | null | undefined) {
  const d = getTaskDueDate(dateStr);

  if (!d) return { label: "Date unavailable", className: "text-muted-foreground" };
  if (isPast(d) && !isToday(d)) return { label: "Overdue", className: "text-destructive" };
  if (isToday(d)) return { label: "Today", className: "text-warning" };
  if (isTomorrow(d)) return { label: "Tomorrow", className: "text-primary" };
  return { label: safeFormat(d, "EEE, MMM d"), className: "text-muted-foreground" };
}

export const UpcomingTasksPanel = memo(function UpcomingTasksPanel() {
  const navigate = useNavigate();
  const { data: tasks = [], isLoading } = useUpcomingTasks();

  return (
    <div className="rounded-lg border border-border bg-card p-4 overflow-hidden min-w-0 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-md bg-primary/10">
          <CalendarClock className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-card-foreground">Upcoming Tasks</h3>
        <span className="ml-auto text-xs font-mono text-muted-foreground">{tasks.length}</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-muted/30 rounded animate-pulse" />)}
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No upcoming tasks this week.</p>
      ) : (
        <div className="space-y-1 max-h-[320px] overflow-y-auto">
          {tasks.map((task) => {
            const taskDueDate = getTaskDueDate(task.due_date);
            const due = dueDateLabel(task.due_date);
            const overdue = !!taskDueDate && isPast(taskDueDate) && !isToday(taskDueDate);
            return (
              <button
                key={task.id}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-colors hover:bg-secondary",
                  overdue && "bg-destructive/5"
                )}
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityDot[task.priority] || "bg-muted-foreground")} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-card-foreground truncate">{task.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn("text-[10px] font-mono", due.className)}>
                      {overdue && <AlertCircle className="w-2.5 h-2.5 inline mr-0.5" />}
                      {due.label}
                    </span>
                    {task.project_name && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 h-3.5"
                        style={{ borderColor: task.project_color + "40", color: task.project_color }}
                      >
                        {task.project_name}
                      </Badge>
                    )}
                  </div>
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
