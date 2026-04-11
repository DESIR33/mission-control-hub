import { useMemo } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { safeGetTime } from "@/lib/date-utils";
import { useTasks } from "@/hooks/use-tasks";
import { useBlockedTaskIds } from "@/hooks/use-task-dependencies";
import { format, isPast, isToday, startOfDay } from "date-fns";
import type { Task, TaskStatus } from "@/types/tasks";

const columns: { id: TaskStatus; label: string; color: string }[] = [
  { id: "todo", label: "To Do", color: "border-muted-foreground/30" },
  { id: "in_progress", label: "In Progress", color: "border-yellow-500/50" },
  { id: "done", label: "Done", color: "border-green-500/50" },
];

const priorityDot: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

const priorityBadge: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30",
};

interface TaskKanbanViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

export function TaskKanbanView({ tasks, onTaskClick }: TaskKanbanViewProps) {
  const { updateTask } = useTasks();
  const blockedIds = useBlockedTaskIds(tasks.map((t) => t.id));

  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = { todo: [], in_progress: [], done: [] };
    tasks.forEach((t) => {
      if (map[t.status]) map[t.status].push(t);
      else map.todo.push(t);
    });
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return safeGetTime(a.due_date) - safeGetTime(b.due_date);
      });
    }
    return map;
  }, [tasks]);

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) updateTask.mutate({ id: taskId, status });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map((col) => (
        <div
          key={col.id}
          className={cn("rounded-xl border-2 border-dashed p-3 min-h-[300px]", col.color)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, col.id)}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground">{col.label}</h3>
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{grouped[col.id]?.length || 0}</span>
          </div>
          <div className="space-y-2">
            {grouped[col.id]?.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("taskId", task.id)}
                onClick={() => onTaskClick(task.id)}
                className="p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", priorityDot[task.priority])} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium truncate", task.status === "done" && "line-through opacity-60")}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", priorityBadge[task.priority])}>
                        {task.priority}
                      </span>
                      {task.due_date && (() => {
                        const due = new Date(task.due_date);
                        const overdue = task.status !== "done" && task.status !== "cancelled" && isPast(startOfDay(due)) && !isToday(due);
                        const dueToday = task.status !== "done" && task.status !== "cancelled" && isToday(due);
                        return (
                          <div className={cn(
                            "flex items-center gap-1 text-xs",
                            overdue ? "text-red-500 font-medium" : dueToday ? "text-amber-500 font-medium" : "text-muted-foreground"
                          )}>
                            {overdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {overdue ? "Overdue" : dueToday ? "Today" : format(due, "MMM d")}
                          </div>
                        );
                      })()}
                    </div>
                    {task.subtask_count != null && task.subtask_count > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                          <span>Subtasks</span>
                          <span>{task.subtask_done_count || 0}/{task.subtask_count}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1">
                          <div
                            className="bg-green-500 h-1 rounded-full transition-all"
                            style={{ width: `${((task.subtask_done_count || 0) / task.subtask_count) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
