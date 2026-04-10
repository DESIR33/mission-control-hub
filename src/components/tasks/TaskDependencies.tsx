import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, X, Plus, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useTaskDependencies, type TaskDependency } from "@/hooks/use-task-dependencies";
import { useTasks } from "@/hooks/use-tasks";

interface TaskDependenciesProps {
  taskId: string;
}

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

  return (
    <div className="flex items-center gap-2 group">
      {isDone ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
      ) : (
        <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      )}
      <button
        onClick={() => navigate(`/tasks/${dep.related_task.id}`)}
        className={cn(
          "text-sm truncate text-left hover:underline",
          isDone && "line-through text-muted-foreground"
        )}
      >
        {dep.related_task.title}
      </button>
      <button
        onClick={() => onRemove(dep.id)}
        disabled={removing}
        className="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
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
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading dependencies...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        <label className="text-xs font-medium text-muted-foreground">Dependencies</label>
        {isBlocked && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/15 text-destructive font-medium">
            Blocked
          </span>
        )}
      </div>

      {/* Blocked by */}
      {blockedBy.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Blocked by
          </p>
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
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Blocking
          </p>
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

      {/* Add dependency */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full text-xs h-7">
            <Plus className="h-3 w-3 mr-1" /> Add dependency
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
