import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/use-tasks";
import { useTaskDomain } from "@/hooks/use-task-domain";
import { useTaskProjects } from "@/hooks/use-task-projects";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task, TaskPriority } from "@/types/tasks";

const priorityColors: Record<string, string> = {
  urgent: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-green-400",
};

interface TaskInboxViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

export function TaskInboxView({ tasks, onTaskClick }: TaskInboxViewProps) {
  const { updateTask } = useTasks();
  const { domains } = useTaskDomain();
  const { projects } = useTaskProjects();

  const triageTask = (taskId: string, field: string, value: any) => {
    const updates: any = { id: taskId, [field]: value };
    if (field === "domain_id" || field === "project_id") {
      updates.is_inbox = false;
    }
    updateTask.mutate(updates);
  };

  if (!tasks.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <CheckCircle2 className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">Inbox zero!</p>
        <p className="text-xs mt-1">All tasks have been triaged</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <button
            onClick={() => updateTask.mutate({ id: task.id, status: "done", is_inbox: false })}
            className="shrink-0"
          >
            <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
          </button>

          <span
            className="flex-1 text-sm font-medium cursor-pointer hover:text-primary truncate"
            onClick={() => onTaskClick(task.id)}
          >
            {task.title}
          </span>

          <Select onValueChange={(v) => triageTask(task.id, "priority", v)}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={(v) => triageTask(task.id, "domain_id", v)}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue placeholder="Domain" />
            </SelectTrigger>
            <SelectContent>
              {domains.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      ))}
    </div>
  );
}
