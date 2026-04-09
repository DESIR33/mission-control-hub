import { useState, KeyboardEvent } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTasks } from "@/hooks/use-tasks";
import { useTaskDomain } from "@/hooks/use-task-domain";
import { useToast } from "@/hooks/use-toast";
import type { TaskPriority } from "@/types/tasks";

export function QuickAddTask({ projectId }: { projectId?: string }) {
  const [value, setValue] = useState("");
  const { createTask } = useTasks();
  const { activeDomainId } = useTaskDomain();
  const { toast } = useToast();

  const handleSubmit = async () => {
    let title = value.trim();
    if (!title) return;

    let priority: TaskPriority = "medium";
    let isInbox = !activeDomainId && !projectId;

    // Parse inline modifiers
    if (title.includes("!urgent")) { priority = "urgent"; title = title.replace("!urgent", "").trim(); }
    else if (title.includes("!high")) { priority = "high"; title = title.replace("!high", "").trim(); }
    else if (title.includes("!low")) { priority = "low"; title = title.replace("!low", "").trim(); }

    try {
      await createTask.mutateAsync({
        title,
        priority,
        status: "todo",
        domain_id: activeDomainId || null,
        project_id: projectId || null,
        is_inbox: isInbox,
      });
      setValue("");
      toast({ title: "Task created" });
    } catch {
      toast({ title: "Failed to create task", variant: "destructive" });
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div className="relative">
      <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        data-quick-add="true"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a task... (⌘K to focus, Enter to create, !high for priority)"
        className="pl-9 bg-muted/50 border-dashed"
      />
    </div>
  );
}
