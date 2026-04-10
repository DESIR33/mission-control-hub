import { useState } from "react";
import { BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTaskTemplates, type SubtaskTemplate } from "@/hooks/use-task-templates";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "@/types/tasks";

interface SaveAsTemplateProps {
  task: Task;
  subtasks?: Task[];
}

export function SaveAsTemplate({ task, subtasks = [] }: SaveAsTemplateProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { createTemplate } = useTaskTemplates();
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) return;

    const subtaskTemplates: SubtaskTemplate[] = subtasks.map((s) => ({
      title: s.title,
      priority: s.priority,
    }));

    try {
      await createTemplate.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        default_priority: task.priority,
        default_status: "todo",
        default_domain_id: task.domain_id,
        default_project_id: task.project_id,
        default_estimated_minutes: task.estimated_minutes,
        subtask_templates: subtaskTemplates,
      });
      toast({ title: "Template saved" });
      setOpen(false);
      setName("");
      setDescription("");
    } catch {
      toast({ title: "Failed to save template", variant: "destructive" });
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setName(task.title);
          setDescription(task.description || "");
          setOpen(true);
        }}
        className="w-full"
      >
        <BookmarkPlus className="h-4 w-4 mr-1" /> Save as Template
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Template Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Weekly Review Checklist"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Description (optional)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this template for?"
                className="min-h-[60px]"
              />
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Will save:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Priority: {task.priority}</li>
                {task.estimated_minutes && <li>Estimate: {task.estimated_minutes} min</li>}
                {subtasks.length > 0 && <li>{subtasks.length} subtask(s)</li>}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim() || createTemplate.isPending}>
              {createTemplate.isPending ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
