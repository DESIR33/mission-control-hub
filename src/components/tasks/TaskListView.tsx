import { useState, useRef, useCallback } from "react";
import { format, isPast, isToday, startOfDay } from "date-fns";
import { CheckCircle2, Circle, Clock, SquareCheck, Square, Trash2, ArrowUpDown, AlertTriangle, GripVertical, LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/use-tasks";
import { useBlockedTaskIds } from "@/hooks/use-task-dependencies";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Task, TaskStatus, TaskPriority } from "@/types/tasks";

const priorityColors: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30",
};

type SortField = "default" | "priority" | "due_date" | "title" | "status";

interface SortRule {
  field: SortField;
  direction: "asc" | "desc";
}

interface TaskListViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

export function TaskListView({ tasks, onTaskClick }: TaskListViewProps) {
  const { updateTask, deleteTask } = useTasks();
  const { toast } = useToast();
  const blockedIds = useBlockedTaskIds(tasks.map((t) => t.id));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortRules, setSortRules] = useState<SortRule[]>([{ field: "default", direction: "asc" }]);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragItemId = useRef<string | null>(null);

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

  const bulkUpdate = async (updates: Partial<Task>) => {
    const promises = Array.from(selected).map((id) => updateTask.mutateAsync({ id, ...updates } as any));
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

  // Multi-sort logic
  const sortedTasks = [...tasks].sort((a, b) => {
    for (const rule of sortRules) {
      let cmp = 0;
      const dir = rule.direction === "desc" ? -1 : 1;

      if (rule.field === "priority") {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 };
        cmp = (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
      } else if (rule.field === "due_date") {
        if (!a.due_date && !b.due_date) cmp = 0;
        else if (!a.due_date) cmp = 1;
        else if (!b.due_date) cmp = -1;
        else cmp = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      } else if (rule.field === "title") {
        cmp = a.title.localeCompare(b.title);
      } else if (rule.field === "status") {
        const statusOrder = { todo: 0, in_progress: 1, done: 2, cancelled: 3 };
        cmp = (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
      }

      if (cmp !== 0) return cmp * dir;
    }
    return 0;
  });

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    e.stopPropagation();
    dragItemId.current = taskId;
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(taskId);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    setDragOverId(null);
    const sourceId = dragItemId.current;
    if (!sourceId || sourceId === targetTaskId) return;

    const targetIndex = sortedTasks.findIndex((t) => t.id === targetTaskId);
    if (targetIndex === -1) return;

    // Calculate new sort_order based on surrounding tasks
    const prevOrder = targetIndex > 0 ? sortedTasks[targetIndex - 1].sort_order : 0;
    const targetOrder = sortedTasks[targetIndex].sort_order;
    const newOrder = Math.floor((prevOrder + targetOrder) / 2) || targetOrder - 1;

    updateTask.mutate({ id: sourceId, sort_order: newOrder });
    dragItemId.current = null;
  }, [sortedTasks, updateTask]);

  const handleDragEnd = useCallback(() => {
    setDragOverId(null);
    dragItemId.current = null;
  }, []);

  // Sort rule management
  const addSortRule = () => {
    const usedFields = new Set(sortRules.map((r) => r.field));
    const available: SortField[] = (["priority", "due_date", "title", "status"] as SortField[]).filter((f) => !usedFields.has(f));
    if (available.length > 0) {
      setSortRules([...sortRules, { field: available[0], direction: "asc" }]);
    }
  };

  const updateSortField = (index: number, field: SortField) => {
    const next = [...sortRules];
    next[index] = { ...next[index], field };
    setSortRules(next);
  };

  const removeSortRule = (index: number) => {
    if (sortRules.length <= 1) {
      setSortRules([{ field: "default", direction: "asc" }]);
    } else {
      setSortRules(sortRules.filter((_, i) => i !== index));
    }
  };

  const isDefaultSort = sortRules.length === 1 && sortRules[0].field === "default";

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
            <div className="flex items-center gap-2 animate-in fade-in flex-wrap">
              <span className="text-xs text-muted-foreground">{selected.size} selected</span>
              <Select onValueChange={(v) => bulkUpdate({ status: v as TaskStatus })}>
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue placeholder="Set status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select onValueChange={(v) => bulkUpdate({ priority: v as TaskPriority })}>
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue placeholder="Set priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={bulkDelete}>
                <Trash2 className="h-3 w-3 mr-1" /> Delete
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {sortRules.map((rule, i) => (
            <div key={i} className="flex items-center gap-0.5">
              {i > 0 && <span className="text-[10px] text-muted-foreground mx-1">then</span>}
              <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
              <Select value={rule.field} onValueChange={(v) => updateSortField(i, v as SortField)}>
                <SelectTrigger className="h-7 w-24 text-xs border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="due_date">Due Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              {!isDefaultSort && (
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => removeSortRule(i)}>
                  &times;
                </Button>
              )}
            </div>
          ))}
          {sortRules.length < 3 && !isDefaultSort && (
            <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 text-muted-foreground" onClick={addSortRule}>
              + sort
            </Button>
          )}
        </div>
      </div>

      {/* Task rows */}
      <div className="space-y-1">
        {sortedTasks.map((task) => (
          <div
            key={task.id}
            draggable={isDefaultSort}
            onDragStart={(e) => handleDragStart(e, task.id)}
            onDragOver={(e) => handleDragOver(e, task.id)}
            onDrop={(e) => handleDrop(e, task.id)}
            onDragEnd={handleDragEnd}
            onClick={() => onTaskClick(task.id)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors group",
              task.status === "done" && "opacity-60",
              selected.has(task.id) && "ring-1 ring-primary",
              dragOverId === task.id && "border-primary bg-primary/5"
            )}
          >
            {isDefaultSort && (
              <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
            )}

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

            {task.due_date && (() => {
              const due = new Date(task.due_date);
              const overdue = task.status !== "done" && task.status !== "cancelled" && isPast(startOfDay(due)) && !isToday(due);
              const dueToday = task.status !== "done" && task.status !== "cancelled" && isToday(due);
              return (
                <div className={cn(
                  "flex items-center gap-1 text-xs shrink-0",
                  overdue ? "text-red-500 font-medium" : dueToday ? "text-amber-500 font-medium" : "text-muted-foreground"
                )}>
                  {overdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {overdue ? "Overdue" : dueToday ? "Today" : format(due, "MMM d")}
                </div>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}
