import { format } from "date-fns";
import { CheckCircle2, Circle, Clock, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/use-tasks";
import type { Task } from "@/types/tasks";

const priorityColors: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30",
};

interface TaskListViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

export function TaskListView({ tasks, onTaskClick }: TaskListViewProps) {
  const { updateTask } = useTasks();

  const toggleDone = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    updateTask.mutate({
      id: task.id,
      status: task.status === "done" ? "todo" : "done",
    });
  };

  if (!tasks.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Circle className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">No tasks yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tasks.map((task) => (
        <div
          key={task.id}
          onClick={() => onTaskClick(task.id)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors group",
            task.status === "done" && "opacity-60"
          )}
        >
          <button onClick={(e) => toggleDone(e, task)} className="shrink-0">
            {task.status === "done" ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-medium truncate", task.status === "done" && "line-through")}>
                {task.title}
              </span>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", priorityColors[task.priority])}>
                {task.priority}
              </span>
            </div>
          </div>

          {task.due_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <Clock className="h-3 w-3" />
              {format(new Date(task.due_date), "MMM d")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
