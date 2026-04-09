import { useState } from "react";
import { format } from "date-fns";
import { Plus, CheckCircle2, Circle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTasks, useSubtasks } from "@/hooks/use-tasks";
import { useWorkspace } from "@/hooks/use-workspace";

interface SubtaskListProps {
  parentTaskId: string;
}

export function SubtaskList({ parentTaskId }: SubtaskListProps) {
  const [newTitle, setNewTitle] = useState("");
  const { workspaceId } = useWorkspace();
  const { tasks: subtasks, createTask, updateTask, deleteTask } = useSubtasks(parentTaskId);

  const addSubtask = async () => {
    if (!newTitle.trim()) return;
    await createTask.mutateAsync({
      title: newTitle.trim(),
      parent_task_id: parentTaskId,
      status: "todo",
      priority: "medium",
    });
    setNewTitle("");
  };

  const doneCount = subtasks.filter((t) => t.status === "done").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Subtasks</h4>
        {subtasks.length > 0 && (
          <span className="text-xs text-muted-foreground">{doneCount}/{subtasks.length}</span>
        )}
      </div>

      {subtasks.length > 0 && (
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-green-500 h-1.5 rounded-full transition-all"
            style={{ width: `${subtasks.length ? (doneCount / subtasks.length) * 100 : 0}%` }}
          />
        </div>
      )}

      <div className="space-y-1">
        {subtasks.map((st) => (
          <div key={st.id} className="flex items-center gap-2 group">
            <button onClick={() => updateTask.mutate({ id: st.id, status: st.status === "done" ? "todo" : "done" })}>
              {st.status === "done" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
              )}
            </button>
            <span className={cn("text-sm flex-1", st.status === "done" && "line-through opacity-60")}>{st.title}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={() => deleteTask.mutate(st.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addSubtask()}
          placeholder="Add subtask..."
          className="h-8 text-sm"
        />
        <Button size="sm" variant="ghost" onClick={addSubtask} disabled={!newTitle.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
