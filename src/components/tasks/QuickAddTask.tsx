import { useState, KeyboardEvent } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTasks } from "@/hooks/use-tasks";
import { useTaskDomain } from "@/hooks/use-task-domain";
import { useToast } from "@/hooks/use-toast";
import { TemplatePicker } from "@/components/tasks/TemplateComponents";
import type { TaskPriority, TaskStatus } from "@/types/tasks";

export function QuickAddTask({ projectId }: { projectId?: string }) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [showOptions, setShowOptions] = useState(false);
  const { createTask } = useTasks();
  const { activeDomainId } = useTaskDomain();
  const { toast } = useToast();

  const handleSubmit = async () => {
    let title = value.trim();
    if (!title) return;

    let finalPriority = priority;
    const isInbox = !activeDomainId && !projectId;

    // Parse inline modifiers (override selector)
    if (title.includes("!urgent")) { finalPriority = "urgent"; title = title.replace("!urgent", "").trim(); }
    else if (title.includes("!high")) { finalPriority = "high"; title = title.replace("!high", "").trim(); }
    else if (title.includes("!low")) { finalPriority = "low"; title = title.replace("!low", "").trim(); }

    try {
      await createTask.mutateAsync({
        title,
        priority: finalPriority,
        status,
        domain_id: activeDomainId || null,
        project_id: projectId || null,
        is_inbox: isInbox,
      });
      setValue("");
      setStatus("todo");
      setPriority("medium");
      setShowOptions(false);
      toast({ title: "Task created" });
    } catch {
      toast({ title: "Failed to create task", variant: "destructive" });
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            data-quick-add="true"
            value={value}
            onChange={(e) => { setValue(e.target.value); if (e.target.value && !showOptions) setShowOptions(true); }}
            onKeyDown={handleKeyDown}
            placeholder="Add a task... (⌘K to focus, Enter to create)"
            className="pl-9 bg-muted/50 border-dashed"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => setShowOptions(!showOptions)}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${showOptions ? "rotate-180" : ""}`} />
        </Button>
        <TemplatePicker domainId={activeDomainId} projectId={projectId} />
      </div>

      {showOptions && (
        <div className="flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-top-1">
          <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" className="h-8 text-xs" onClick={handleSubmit} disabled={!value.trim()}>
            Create
          </Button>
        </div>
      )}
    </div>
  );
}
