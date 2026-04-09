import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TaskStatus, TaskPriority } from "@/types/tasks";

interface TaskFiltersBarProps {
  statusFilter: TaskStatus[];
  onStatusChange: (statuses: TaskStatus[]) => void;
  priorityFilter: TaskPriority[];
  onPriorityChange: (priorities: TaskPriority[]) => void;
}

const statuses: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

const priorities: { value: TaskPriority; label: string; color: string }[] = [
  { value: "urgent", label: "Urgent", color: "border-red-500/50 text-red-400" },
  { value: "high", label: "High", color: "border-orange-500/50 text-orange-400" },
  { value: "medium", label: "Medium", color: "border-yellow-500/50 text-yellow-400" },
  { value: "low", label: "Low", color: "border-green-500/50 text-green-400" },
];

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

export function TaskFiltersBar({ statusFilter, onStatusChange, priorityFilter, onPriorityChange }: TaskFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium">Status:</span>
      {statuses.map((s) => (
        <Button
          key={s.value}
          variant="outline"
          size="sm"
          className={cn(
            "h-6 text-[10px] px-2",
            statusFilter.includes(s.value) && "bg-primary/10 border-primary text-primary"
          )}
          onClick={() => onStatusChange(toggle(statusFilter, s.value))}
        >
          {s.label}
        </Button>
      ))}
      <div className="w-px h-4 bg-border mx-1" />
      <span className="text-xs text-muted-foreground font-medium">Priority:</span>
      {priorities.map((p) => (
        <Button
          key={p.value}
          variant="outline"
          size="sm"
          className={cn(
            "h-6 text-[10px] px-2",
            priorityFilter.includes(p.value) ? p.color : ""
          )}
          onClick={() => onPriorityChange(toggle(priorityFilter, p.value))}
        >
          {p.label}
        </Button>
      ))}
      {(statusFilter.length > 0 || priorityFilter.length > 0) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] px-2 text-muted-foreground"
          onClick={() => { onStatusChange([]); onPriorityChange([]); }}
        >
          Clear
        </Button>
      )}
    </div>
  );
}
