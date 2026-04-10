import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubtaskList } from "@/components/tasks/SubtaskList";
import { TaskComments } from "@/components/tasks/TaskComments";
import { TaskActivityLog } from "@/components/tasks/TaskActivityLog";
import { LabelPicker } from "@/components/tasks/LabelPicker";
import { RecurrencePicker } from "@/components/tasks/RecurrencePicker";
import { TaskDependencies } from "@/components/tasks/TaskDependencies";
import { SaveAsTemplate } from "@/components/tasks/SaveAsTemplate";
import { useTasks, useSubtasks } from "@/hooks/use-tasks";
import { useTaskDomain, TaskDomainProvider } from "@/hooks/use-task-domain";
import { useTaskProjects } from "@/hooks/use-task-projects";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/hooks/use-workspace";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { useState, useEffect } from "react";
import type { Task, TaskStatus, TaskPriority } from "@/types/tasks";

function TaskDetailContent() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { workspaceId } = useWorkspace();
  const { updateTask, deleteTask, createTask } = useTasks();
  const { domains } = useTaskDomain();
  const { projects } = useTaskProjects();
  const { toast } = useToast();

  const { data: task, isLoading } = useQuery({
    queryKey: ["task-detail", taskId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tasks").select("*").eq("id", taskId).single();
      if (error) throw error;
      return data as Task;
    },
    enabled: !!taskId,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
    }
  }, [task]);

  const saveField = (field: string, value: any) => {
    if (!taskId) return;
    updateTask.mutate({ id: taskId, [field]: value } as any);
  };

  const handleDelete = async () => {
    if (!taskId) return;
    await deleteTask.mutateAsync(taskId);
    toast({ title: "Task deleted" });
    navigate("/tasks/all");
  };

  if (isLoading || !task) {
    return <div className="p-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => saveField("title", title)}
            className="text-xl font-bold border-none bg-transparent px-0 focus-visible:ring-0"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => saveField("description", description || null)}
            placeholder="Add a description..."
            className="min-h-[100px] border-dashed"
          />

          <SubtaskList parentTaskId={task.id} />
          <div className="border-t pt-6">
            <TaskComments taskId={task.id} />
          </div>
          <div className="border-t pt-6">
            <TaskActivityLog taskId={task.id} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
            <Select value={task.status} onValueChange={(v) => saveField("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
            <Select value={task.priority} onValueChange={(v) => saveField("priority", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Domain</label>
            <Select value={task.domain_id || ""} onValueChange={(v) => saveField("domain_id", v || null)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {domains.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Project</label>
            <Select value={task.project_id || ""} onValueChange={(v) => saveField("project_id", v || null)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Due Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !task.due_date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {task.due_date ? format(new Date(task.due_date), "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={task.due_date ? new Date(task.due_date) : undefined}
                  onSelect={(date) => saveField("due_date", date?.toISOString() || null)}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !task.start_date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {task.start_date ? format(new Date(task.start_date), "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={task.start_date ? new Date(task.start_date) : undefined}
                  onSelect={(date) => saveField("start_date", date?.toISOString() || null)}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Estimated Minutes</label>
            <Input
              type="number"
              value={task.estimated_minutes || ""}
              onChange={(e) => saveField("estimated_minutes", e.target.value ? parseInt(e.target.value) : null)}
              placeholder="0"
            />
          </div>

          <RecurrencePicker
            value={task.recurrence_rule}
            onChange={(v) => saveField("recurrence_rule", v === "none" ? null : v)}
          />

          <LabelPicker taskId={task.id} />

          <TaskDependencies taskId={task.id} />

          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Created {format(new Date(task.created_at), "MMM d, yyyy")}
            </p>
            {task.completed_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Completed {format(new Date(task.completed_at), "MMM d, yyyy")}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={async () => {
                try {
                  const newTask = await createTask.mutateAsync({
                    title: `${task.title} (copy)`,
                    description: task.description,
                    status: "todo",
                    priority: task.priority,
                    due_date: task.due_date,
                    start_date: task.start_date,
                    domain_id: task.domain_id,
                    project_id: task.project_id,
                    estimated_minutes: task.estimated_minutes,
                    recurrence_rule: task.recurrence_rule,
                    category: task.category,
                    is_inbox: task.is_inbox,
                    assigned_to: task.assigned_to,
                  });
                  toast({ title: "Task duplicated" });
                  if (newTask?.id) navigate(`/tasks/${newTask.id}`);
                } catch {
                  toast({ title: "Failed to duplicate", variant: "destructive" });
                }
              }}
            >
              <Copy className="h-4 w-4 mr-1" /> Duplicate
            </Button>
            <Button variant="destructive" size="sm" className="flex-1" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TaskDetailPage() {
  return (
    <TaskDomainProvider>
      <TaskDetailContent />
    </TaskDomainProvider>
  );
}
