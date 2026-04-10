import { useState } from "react";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useTasks, useSubtasks } from "@/hooks/use-tasks";
import { useWorkspace } from "@/hooks/use-workspace";
import type { TaskStatus, TaskPriority } from "@/types/tasks";

interface SubtaskListProps {
  parentTaskId: string;
}

const statusConfig: Record<TaskStatus, { label: string; class: string }> = {
  todo: { label: "TO DO", class: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress: { label: "IN PROGRESS", class: "bg-amber-100 text-amber-700 border-amber-200" },
  done: { label: "DONE", class: "bg-green-100 text-green-700 border-green-200" },
  cancelled: { label: "CANCELLED", class: "bg-gray-100 text-gray-600 border-gray-200" },
};

const priorityLetters: Record<TaskPriority, { letter: string; class: string }> = {
  urgent: { letter: "U", class: "text-red-500" },
  high: { letter: "H", class: "text-orange-500" },
  medium: { letter: "M", class: "text-yellow-600" },
  low: { letter: "L", class: "text-blue-500" },
};

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
  const pct = subtasks.length ? Math.round((doneCount / subtasks.length) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      {subtasks.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all bg-green-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
            {pct}% Done
          </span>
        </div>
      )}

      {/* Table */}
      {subtasks.length > 0 && (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-xs font-medium h-8">Work</TableHead>
                <TableHead className="text-xs font-medium h-8 w-16 text-center">Priority</TableHead>
                <TableHead className="text-xs font-medium h-8 w-32">Status</TableHead>
                <TableHead className="text-xs font-medium h-8 w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {subtasks.map((st) => {
                const stStatus = statusConfig[st.status as TaskStatus] || statusConfig.todo;
                const stPriority = priorityLetters[st.priority as TaskPriority] || priorityLetters.medium;

                return (
                  <TableRow key={st.id} className="group">
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateTask.mutate({
                              id: st.id,
                              status: st.status === "done" ? "todo" : "done",
                            })
                          }
                          className="shrink-0"
                        >
                          {st.status === "done" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          )}
                        </button>
                        <span
                          className={cn(
                            "text-sm",
                            st.status === "done" && "line-through opacity-60"
                          )}
                        >
                          {st.title}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-center">
                      <span className={cn("text-xs font-bold", stPriority.class)}>
                        {stPriority.letter}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <Select
                        value={st.status}
                        onValueChange={(v) =>
                          updateTask.mutate({ id: st.id, status: v as TaskStatus })
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            "h-6 text-[10px] font-semibold border rounded-sm px-2 w-auto gap-1",
                            stStatus.class
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([key, cfg]) => (
                            <SelectItem key={key} value={key}>
                              {cfg.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={() => deleteTask.mutate(st.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add subtask */}
      <div className="flex items-center gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addSubtask()}
          placeholder="Add subtask..."
          className="h-8 text-sm"
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={addSubtask}
          disabled={!newTitle.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
