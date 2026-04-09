import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTaskLabels, useTaskLabelAssignments } from "@/hooks/use-task-labels";
import { cn } from "@/lib/utils";

interface LabelPickerProps {
  taskId: string;
}

const presetColors = ["#6366f1", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"];

export function LabelPicker({ taskId }: LabelPickerProps) {
  const { labels, createLabel, toggleLabel } = useTaskLabels();
  const { assignments } = useTaskLabelAssignments(taskId);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");

  const assignedIds = new Set(assignments.map((a: any) => a.label_id));

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createLabel.mutateAsync({ name: newName.trim(), color: newColor });
    setNewName("");
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Labels</h4>
      <div className="flex flex-wrap gap-1.5">
        {assignments.map((a: any) => (
          <span
            key={a.id}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium"
            style={{ borderColor: a.label?.color, color: a.label?.color }}
          >
            {a.label?.name}
            <button onClick={() => toggleLabel.mutate({ taskId, labelId: a.label_id, assigned: true })}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs">
            <Plus className="h-3 w-3 mr-1" /> Add label
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3 space-y-3" align="start">
          <div className="space-y-1">
            {labels
              .filter((l) => !assignedIds.has(l.id))
              .map((l) => (
                <button
                  key={l.id}
                  onClick={() => toggleLabel.mutate({ taskId, labelId: l.id, assigned: false })}
                  className="flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-accent text-sm"
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                  {l.name}
                </button>
              ))}
          </div>
          <div className="border-t pt-2 space-y-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New label..."
              className="h-7 text-xs"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="flex gap-1">
              {presetColors.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={cn("w-5 h-5 rounded-full border-2", newColor === c ? "border-foreground" : "border-transparent")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
