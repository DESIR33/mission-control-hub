import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, X, Plus, CheckCircle2, Circle, Loader2, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useTaskDependencies, type TaskDependency } from "@/hooks/use-task-dependencies";
import { useTasks } from "@/hooks/use-tasks";

interface TaskDependenciesProps {
  taskId: string;
}

const statusBadgeClass: Record<string, string> = {
  todo: "bg-blue-100 text-blue-700 border-blue-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  done: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

const statusLabel: Record<string, string> = {
  todo: "TO DO",
  in_progress: "IN PROGRESS",
  done: "DONE",
  cancelled: "CANCELLED",
};

const priorityIcon: Record<string, { arrow: string; class: string }> = {
  urgent: { arrow: "\u2191\u2191", class: "text-red-500" },
  high: { arrow: "\u2191", class: "text-orange-500" },
  medium: { arrow: "\u2192", class: "text-yellow-600" },
  low: { arrow: "\u2193", class: "text-blue-500" },
};

function DepItem({
  dep,
  onRemove,
  removing,
}: {
  dep: TaskDependency;
  onRemove: (id: string) => void;
  removing: boolean;
}) {
  const navigate = useNavigate();
  const isDone = dep.related_task.status === "done";
  const badge = statusBadgeClass[dep.related_task.status] || statusBadgeClass.todo;
  const label = statusLabel[dep.related_task.status] || "TO DO";
  const pIcon = priorityIcon[dep.related_task.priority] || priorityIcon.medium;

  return (
    <div className="flex items-center gap-3 py-1.5 group">
      <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <button
        onClick={() => navigate(`/tasks/${dep.related_task.id}`)}
        className={cn(
          "text-sm truncate text-left hover:underline flex-1",
          isDone && "line-through text-muted-foreground"
        )}
      >
        {dep.related_task.title}
      </button>
      <Badge
        variant="outline"
        className={cn("text-[10px] font-semibold px-1.5 py-0 h-5 rounded-sm shrink-0", badge)}
      >
        {label}
      </Badge>
      <span className={cn("text-xs font-bold shrink-0", pIcon.class)}>
        {pIcon.arrow}
      </span>
      <button
        onClick={() => onRemove(dep.id)}
        disabled={removing}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function TaskDependencies({ taskId }: TaskDependenciesProps) {
  const { blockedBy, blocking, isBlocked, isLoading, addDependency, removeDependency } =
    useTaskDependencies(taskId);
  const { tasks } = useTasks();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const existingIds = new Set([
    taskId,
    ...blockedBy.map((d) => d.depends_on_task_id),
  ]);

  const filtered = (tasks || [])
    .filter((t) => !existingIds.has(t.id))
    .filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 20);

  const handleAdd = (depTaskId: string) => {
    addDependency.mutate(depTaskId);
    setOpen(false);
    setSearch("");
  };

  const handleRemove = (depId: string) => {
    removeDependency.mutate(depId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading dependencies...
      </div>
    );
  }

  const hasItems = blockedBy.length > 0 || blocking.length > 0;

  return (
    <div className="space-y-3">
      {isBlocked && (
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
          Blocked
        </Badge>
      )}

      {/* Blocked by */}
      {blockedBy.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground font-medium mb-1">blocked by</p>
          {blockedBy.map((dep) => (
            <DepItem
              key={dep.id}
              dep={dep}
              onRemove={handleRemove}
              removing={removeDependency.isPending}
            />
          ))}
        </div>
      )}

      {/* Blocking */}
      {blocking.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground font-medium mb-1">blocking</p>
          {blocking.map((dep) => (
            <DepItem
              key={dep.id}
              dep={dep}
              onRemove={handleRemove}
              removing={removeDependency.isPending}
            />
          ))}
        </div>
      )}

      {!hasItems && (
        <p className="text-xs text-muted-foreground py-2">No linked items</p>
      )}

      {/* Add dependency */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
            <Plus className="h-3 w-3" /> Link issue
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs mb-2"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">No tasks found</p>
            )}
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => handleAdd(t.id)}
                className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent truncate"
              >
                {t.title}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
