import { useMemo } from "react";
import { CheckCircle2, Circle, Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/use-tasks";
import { useBlockedTaskIds } from "@/hooks/use-task-dependencies";
import { format } from "date-fns";
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
                    <div className="flex items-center gap-1.5">
                      {blockedIds.has(task.id) && (
                        <Lock className="h-3 w-3 text-destructive shrink-0" />
                      )}
                      <p className={cn("text-sm font-medium truncate", task.status === "done" && "line-through opacity-60")}>
                        {task.title}
                      </p>
                    </div>
                    {task.due_date && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(task.due_date), "MMM d")}
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
