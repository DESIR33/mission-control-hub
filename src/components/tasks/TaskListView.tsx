import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Circle, Clock, SquareCheck, Square, Trash2, ArrowUpDown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/use-tasks";
import { useBlockedTaskIds } from "@/hooks/use-task-dependencies";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Task, TaskStatus } from "@/types/tasks";

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
  const { updateTask, deleteTask } = useTasks();
  const { toast } = useToast();
  const blockedIds = useBlockedTaskIds(tasks.map((t) => t.id));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"default" | "priority" | "due_date">("default");

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === tasks.length) setSelected(new Set());
    else setSelected(new Set(tasks.map((t) => t.id)));
  };

  const bulkUpdateStatus = async (status: TaskStatus) => {
    const promises = Array.from(selected).map((id) => updateTask.mutateAsync({ id, status }));
    await Promise.all(promises);
    setSelected(new Set());
    toast({ title: `${promises.length} tasks updated` });
  };

  const bulkDelete = async () => {
    const promises = Array.from(selected).map((id) => deleteTask.mutateAsync(id));
    await Promise.all(promises);
    setSelected(new Set());
    toast({ title: `${promises.length} tasks deleted` });
  };

  const toggleDone = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    updateTask.mutate({
      id: task.id,
      status: task.status === "done" ? "todo" : "done",
    });
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortBy === "priority") {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
    }
    if (sortBy === "due_date") {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    return 0;
  });

  if (!tasks.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Circle className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">No tasks yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={selectAll} className="text-muted-foreground hover:text-foreground">
            {selected.size === tasks.length ? <SquareCheck className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          </button>
          {selected.size > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in">
              <span className="text-xs text-muted-foreground">{selected.size} selected</span>
              <Select onValueChange={(v) => bulkUpdateStatus(v as TaskStatus)}>
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue placeholder="Set status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={bulkDelete}>
                <Trash2 className="h-3 w-3 mr-1" /> Delete
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="h-7 w-28 text-xs border-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="due_date">Due Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Task rows */}
      <div className="space-y-1">
        {sortedTasks.map((task) => (
          <div
            key={task.id}
            onClick={() => onTaskClick(task.id)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors group",
              task.status === "done" && "opacity-60",
              selected.has(task.id) && "ring-1 ring-primary"
            )}
          >
            <button onClick={(e) => toggleSelect(e, task.id)} className="shrink-0">
              {selected.has(task.id) ? (
                <SquareCheck className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>

            <button onClick={(e) => toggleDone(e, task)} className="shrink-0">
              {task.status === "done" ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {blockedIds.has(task.id) && (
                  <Lock className="h-3.5 w-3.5 text-destructive shrink-0" />
                )}
                <span className={cn("text-sm font-medium truncate", task.status === "done" && "line-through")}>
                  {task.title}
                </span>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium hidden sm:inline", priorityColors[task.priority])}>
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
    </div>
  );
}
