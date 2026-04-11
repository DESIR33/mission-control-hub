import { useState, useCallback } from "react";
import { format, isPast, isToday, startOfDay } from "date-fns";
import { CheckCircle2, Circle, AlertTriangle, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/use-tasks";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task, TaskStatus, TaskPriority } from "@/types/tasks";
import { safeFormat, safeGetTime } from "@/lib/date-utils";

const priorityColors: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30",
};

const statusLabels: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

type SortField = "title" | "status" | "priority" | "due_date";
type SortDir = "asc" | "desc";

interface TaskTableViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

export function TaskTableView({ tasks, onTaskClick }: TaskTableViewProps) {
  const { updateTask } = useTasks();
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }, [sortField]);

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!sortField) return 0;
    const dir = sortDir === "desc" ? -1 : 1;

    if (sortField === "title") return a.title.localeCompare(b.title) * dir;
    if (sortField === "status") {
      const order = { todo: 0, in_progress: 1, done: 2, cancelled: 3 };
      return ((order[a.status] ?? 0) - (order[b.status] ?? 0)) * dir;
    }
    if (sortField === "priority") {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      return ((order[a.priority] ?? 2) - (order[b.priority] ?? 2)) * dir;
    }
    if (sortField === "due_date") {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1 * dir;
      if (!b.due_date) return -1 * dir;
      return (safeGetTime(a.due_date) - safeGetTime(b.due_date)) * dir;
    }
    return 0;
  });

  const startEdit = (taskId: string, field: string, currentValue: string) => {
    setEditingCell({ taskId, field });
    setEditValue(currentValue);
  };

  const commitEdit = (taskId: string, field: string) => {
    setEditingCell(null);
    if (field === "title" && editValue.trim()) {
      updateTask.mutate({ id: taskId, title: editValue.trim() });
    } else if (field === "estimated_minutes") {
      updateTask.mutate({ id: taskId, estimated_minutes: editValue ? parseInt(editValue) : null } as any);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
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
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="w-10 px-3 py-2" />
            <th
              className="text-left px-3 py-2 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
              onClick={() => handleSort("title")}
            >
              <span className="flex items-center gap-1">Title <SortIcon field="title" /></span>
            </th>
            <th
              className="text-left px-3 py-2 font-medium text-muted-foreground cursor-pointer hover:text-foreground w-32 select-none"
              onClick={() => handleSort("status")}
            >
              <span className="flex items-center gap-1">Status <SortIcon field="status" /></span>
            </th>
            <th
              className="text-left px-3 py-2 font-medium text-muted-foreground cursor-pointer hover:text-foreground w-28 select-none"
              onClick={() => handleSort("priority")}
            >
              <span className="flex items-center gap-1">Priority <SortIcon field="priority" /></span>
            </th>
            <th
              className="text-left px-3 py-2 font-medium text-muted-foreground cursor-pointer hover:text-foreground w-32 select-none"
              onClick={() => handleSort("due_date")}
            >
              <span className="flex items-center gap-1">Due Date <SortIcon field="due_date" /></span>
            </th>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground w-24 select-none">
              Est. Min
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTasks.map((task) => {
            const overdue = task.due_date && task.status !== "done" && task.status !== "cancelled" && isPast(startOfDay(new Date(task.due_date))) && !isToday(new Date(task.due_date));
            const dueToday = task.due_date && task.status !== "done" && task.status !== "cancelled" && isToday(new Date(task.due_date));

            return (
              <tr
                key={task.id}
                className={cn(
                  "border-b last:border-b-0 hover:bg-accent/50 transition-colors",
                  task.status === "done" && "opacity-60"
                )}
              >
                {/* Done toggle */}
                <td className="px-3 py-2">
                  <button onClick={() => updateTask.mutate({ id: task.id, status: task.status === "done" ? "todo" : "done" })}>
                    {task.status === "done" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    )}
                  </button>
                </td>

                {/* Title - inline editable */}
                <td className="px-3 py-2">
                  {editingCell?.taskId === task.id && editingCell?.field === "title" ? (
                    <Input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitEdit(task.id, "title")}
                      onKeyDown={(e) => { if (e.key === "Enter") commitEdit(task.id, "title"); if (e.key === "Escape") setEditingCell(null); }}
                      className="h-7 text-sm"
                    />
                  ) : (
                    <span
                      className={cn("cursor-pointer hover:text-primary", task.status === "done" && "line-through")}
                      onClick={() => onTaskClick(task.id)}
                      onDoubleClick={() => startEdit(task.id, "title", task.title)}
                    >
                      {task.title}
                    </span>
                  )}
                </td>

                {/* Status - inline select */}
                <td className="px-3 py-2">
                  <Select value={task.status} onValueChange={(v) => updateTask.mutate({ id: task.id, status: v as TaskStatus })}>
                    <SelectTrigger className="h-7 text-xs border-none bg-transparent px-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </td>

                {/* Priority - inline select */}
                <td className="px-3 py-2">
                  <Select value={task.priority} onValueChange={(v) => updateTask.mutate({ id: task.id, priority: v as TaskPriority } as any)}>
                    <SelectTrigger className={cn("h-7 text-xs border px-1.5 rounded", priorityColors[task.priority])}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </td>

                {/* Due Date */}
                <td className={cn("px-3 py-2 text-xs", overdue ? "text-red-500 font-medium" : dueToday ? "text-amber-500 font-medium" : "text-muted-foreground")}>
                  {task.due_date ? (
                    <span className="flex items-center gap-1">
                      {overdue && <AlertTriangle className="h-3 w-3" />}
                      {overdue ? "Overdue" : dueToday ? "Today" : safeFormat(task.due_date, "MMM d, yyyy")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/50">--</span>
                  )}
                </td>

                {/* Estimated Minutes - inline editable */}
                <td className="px-3 py-2">
                  {editingCell?.taskId === task.id && editingCell?.field === "estimated_minutes" ? (
                    <Input
                      autoFocus
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitEdit(task.id, "estimated_minutes")}
                      onKeyDown={(e) => { if (e.key === "Enter") commitEdit(task.id, "estimated_minutes"); if (e.key === "Escape") setEditingCell(null); }}
                      className="h-7 text-xs w-16"
                    />
                  ) : (
                    <span
                      className="text-xs text-muted-foreground cursor-pointer hover:text-foreground"
                      onDoubleClick={() => startEdit(task.id, "estimated_minutes", task.estimated_minutes?.toString() || "")}
                    >
                      {task.estimated_minutes ? `${task.estimated_minutes}m` : "--"}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
