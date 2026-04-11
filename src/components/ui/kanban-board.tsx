import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { safeFormat } from "@/lib/date-utils";
import { Clock, Building2, User2 } from "lucide-react";

interface TaskWithRelations {
  id: number;
  name: string;
  description: string | null;
  status: string;
  priority: "low" | "medium" | "high";
  dueDate: string;
  assigneeId?: number;
  projectId?: number;
  companyId?: number;
  contactId?: number;
  company?: {
    id: number;
    name: string;
    logo?: string;
  };
  contact?: {
    id: number;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  creator: {
    id: number;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  assignee?: {
    id: number;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  labels?: string[];
}

const statuses = [
  { id: "pending", name: "To Do", color: "#6B7280" },
  { id: "in_progress", name: "In Progress", color: "#F59E0B" },
  { id: "completed", name: "Completed", color: "#10B981" },
];

interface KanbanBoardProps {
  tasks: TaskWithRelations[];
  projectId?: number;
  onTaskClick?: (taskId: number) => void;
}

export function KanbanBoard({ tasks, projectId, onTaskClick }: KanbanBoardProps) {
  const queryClient = useQueryClient();

  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update task status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks-extended"] });
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: [`/api/tasks-extended/project/${projectId}`],
        });
      }
    },
  });

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, TaskWithRelations[]> = {};
    for (const status of statuses) {
      grouped[status.id] = [];
    }
    for (const task of tasks) {
      const statusKey = task.status in grouped ? task.status : "pending";
      grouped[statusKey].push(task);
    }
    return grouped;
  }, [tasks]);

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData("taskId", String(taskId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = Number(e.dataTransfer.getData("taskId"));
    if (taskId) {
      updateTaskStatus.mutate({ taskId, status });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statuses.map((status) => (
        <div
          key={status.id}
          className="border rounded-lg p-4 bg-muted/30"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, status.id)}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: status.color }}
            />
            <h3 className="font-medium text-sm">{status.name}</h3>
            <span className="text-xs text-muted-foreground ml-auto">
              {tasksByStatus[status.id]?.length || 0}
            </span>
          </div>

          <div className="space-y-3">
            {tasksByStatus[status.id]?.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onClick={() => onTaskClick?.(task.id)}
                className="p-3 rounded-lg border bg-card hover:border-primary cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-sm font-medium leading-tight">{task.name}</h4>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                      {
                        "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300":
                          task.priority === "high",
                        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300":
                          task.priority === "medium",
                        "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300":
                          task.priority === "low",
                      }
                    )}
                  >
                    {task.priority}
                  </span>
                </div>

                {task.description && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {task.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {safeFormat(task.dueDate, "MMM dd")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {task.company && (
                      <div className="flex items-center gap-1" title={task.company.name}>
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}

                    {task.assignee && (
                      <Avatar className="h-5 w-5">
                        {task.assignee.avatar ? (
                          <AvatarImage
                            src={task.assignee.avatar}
                            alt={`${task.assignee.firstName} ${task.assignee.lastName}`}
                          />
                        ) : (
                          <AvatarFallback className="text-[8px]">
                            {task.assignee.firstName[0]}
                            {task.assignee.lastName[0]}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {(!tasksByStatus[status.id] || tasksByStatus[status.id].length === 0) && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No tasks
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
