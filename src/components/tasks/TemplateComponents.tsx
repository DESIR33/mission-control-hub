import { useState } from "react";
import { LayoutTemplate, Trash2, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTaskTemplates } from "@/hooks/use-task-templates";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TemplatePickerProps {
  domainId?: string | null;
  projectId?: string | null;
  onTaskCreated?: (taskId: string) => void;
}

export function TemplatePicker({ domainId, projectId, onTaskCreated }: TemplatePickerProps) {
  const { templates, isLoading, createTaskFromTemplate } = useTaskTemplates();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);

  const handleSelect = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    setCreating(true);
    try {
      const task = await createTaskFromTemplate(template, {
        domain_id: domainId,
        project_id: projectId,
      });
      toast({ title: `Created "${template.name}" from template` });
      onTaskCreated?.(task.id);
    } catch {
      toast({ title: "Failed to create from template", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (templates.length === 0 && !isLoading) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0" disabled={creating}>
          <LayoutTemplate className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-xs font-semibold text-muted-foreground">Create from template</p>
        </div>
        <DropdownMenuSeparator />
        {templates.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => handleSelect(t.id)}
            className="flex items-center gap-2"
          >
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{t.name}</p>
              {t.subtask_templates.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {t.subtask_templates.length} subtask(s)
                </p>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TemplateManager() {
  const [open, setOpen] = useState(false);
  const { templates, isLoading, deleteTemplate } = useTaskTemplates();
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id);
      toast({ title: "Template deleted" });
    } catch {
      toast({ title: "Failed to delete template", variant: "destructive" });
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="gap-1.5 text-xs">
        <LayoutTemplate className="h-3.5 w-3.5" />
        Templates
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Task Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {isLoading && (
              <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
            )}
            {!isLoading && templates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <LayoutTemplate className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No templates yet</p>
                <p className="text-xs mt-1">
                  Open a task and click "Save as Template" to create one
                </p>
              </div>
            )}
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card group"
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {t.default_priority && (
                      <span className="text-[10px] text-muted-foreground">
                        {t.default_priority}
                      </span>
                    )}
                    {t.subtask_templates.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {t.subtask_templates.length} subtask(s)
                      </span>
                    )}
                    {t.default_estimated_minutes && (
                      <span className="text-[10px] text-muted-foreground">
                        {t.default_estimated_minutes}m
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                  onClick={() => handleDelete(t.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
