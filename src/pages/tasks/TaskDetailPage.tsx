import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Trash2, Copy, ChevronDown, ChevronRight,
  CheckCircle2, MoreHorizontal, GitBranch, GitCommit,
  Link2, Zap, RefreshCw, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { useState, useEffect } from "react";
import type { Task, TaskStatus, TaskPriority } from "@/types/tasks";

const statusConfig: Record<TaskStatus, { label: string; class: string }> = {
  todo: { label: "TO DO", class: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress: { label: "IN PROGRESS", class: "bg-amber-100 text-amber-700 border-amber-200" },
  done: { label: "DONE", class: "bg-green-100 text-green-700 border-green-200" },
  cancelled: { label: "CANCELLED", class: "bg-gray-100 text-gray-600 border-gray-200" },
};

const priorityConfig: Record<TaskPriority, { label: string; class: string }> = {
  urgent: { label: "Highest", class: "text-red-500" },
  high: { label: "High", class: "text-orange-500" },
  medium: { label: "Medium", class: "text-yellow-600" },
  low: { label: "Low", class: "text-blue-500" },
};

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  action,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center justify-between w-full py-2 group">
          <div className="flex items-center gap-1.5">
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                !open && "-rotate-90"
              )}
            />
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          {action && (
            <span
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {action}
            </span>
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2 gap-4">
      <span className="text-sm text-muted-foreground whitespace-nowrap">{label}</span>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  );
}

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
      const { data, error } = await (supabase as any)
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();
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

  const handleDuplicate = async () => {
    if (!task) return;
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
  };

  if (isLoading || !task) {
    return <div className="p-8 text-muted-foreground">Loading...</div>;
  }

  const domainName = domains.find((d) => d.id === task.domain_id)?.name;
  const projectName = projects.find((p) => p.id === task.project_id)?.name;
  const shortId = task.id.slice(0, 8).toUpperCase();
  const status = statusConfig[task.status];
  const priority = priorityConfig[task.priority];

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen max-w-7xl mx-auto">
      {/* Breadcrumbs */}
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/tasks/all">Tasks</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {domainName && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/tasks/all">{domainName}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          {projectName && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/tasks/all">{projectName}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{shortId}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="mb-6">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => saveField("title", title)}
          className="text-2xl font-bold border-none bg-transparent px-0 focus-visible:ring-0 h-auto py-1"
        />
        <div className="flex items-center gap-2 mt-3">
          <Select
            value={task.status}
            onValueChange={(v) => saveField("status", v)}
          >
            <SelectTrigger
              className={cn(
                "w-auto h-7 text-xs font-semibold border rounded-sm px-3 gap-1",
                status.class
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
          {task.status !== "done" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => saveField("status", "done")}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Done
            </Button>
          )}
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleDuplicate}
              title="Duplicate"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDelete}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Description</h3>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => saveField("description", description || null)}
              placeholder="Add a description..."
              className="min-h-[80px] border-dashed"
            />
          </div>

          {/* Subtasks */}
          <Separator />
          <CollapsibleSection title="Subtasks">
            <SubtaskList parentTaskId={task.id} />
          </CollapsibleSection>

          {/* Linked work items (Dependencies) */}
          <Separator />
          <CollapsibleSection title="Linked work items">
            <TaskDependencies taskId={task.id} />
          </CollapsibleSection>

          {/* Activity with Tabs */}
          <Separator />
          <CollapsibleSection title="Activity">
            <Tabs defaultValue="comments" className="mt-2">
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-3 h-6">
                  All
                </TabsTrigger>
                <TabsTrigger value="comments" className="text-xs px-3 h-6">
                  Comments
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs px-3 h-6">
                  History
                </TabsTrigger>
                <TabsTrigger value="work-log" className="text-xs px-3 h-6">
                  Work log
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4 space-y-6">
                <TaskComments taskId={task.id} />
                <Separator />
                <TaskActivityLog taskId={task.id} />
              </TabsContent>
              <TabsContent value="comments" className="mt-4">
                <TaskComments taskId={task.id} />
              </TabsContent>
              <TabsContent value="history" className="mt-4">
                <TaskActivityLog taskId={task.id} />
              </TabsContent>
              <TabsContent value="work-log" className="mt-4">
                <p className="text-sm text-muted-foreground text-center py-6">
                  No work logged yet
                </p>
              </TabsContent>
            </Tabs>
          </CollapsibleSection>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Details section */}
          <CollapsibleSection title="Details">
            <div className="divide-y">
              <DetailRow label="Priority">
                <Select
                  value={task.priority}
                  onValueChange={(v) => saveField("priority", v)}
                >
                  <SelectTrigger className="w-auto h-7 text-xs border-none shadow-none px-2 gap-1">
                    <span className={cn("font-medium", priority.class)}>
                      {priority.label}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <span className={cfg.class}>{cfg.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </DetailRow>

              <DetailRow label="Assignee">
                <span className="text-sm text-muted-foreground">
                  {task.assigned_to ? task.assigned_to.slice(0, 8) : "Unassigned"}
                </span>
              </DetailRow>

              <DetailRow label="Parent">
                <span className="text-sm text-muted-foreground">
                  {task.parent_task_id ? (
                    <Link
                      to={`/tasks/${task.parent_task_id}`}
                      className="hover:underline text-primary"
                    >
                      Parent task
                    </Link>
                  ) : (
                    "None"
                  )}
                </span>
              </DetailRow>

              <DetailRow label="Due date">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 text-xs font-normal px-2",
                        !task.due_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1.5 h-3 w-3" />
                      {task.due_date
                        ? format(new Date(task.due_date), "MMM dd, yyyy")
                        : "None"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={
                        task.due_date ? new Date(task.due_date) : undefined
                      }
                      onSelect={(date) =>
                        saveField("due_date", date?.toISOString() || null)
                      }
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </DetailRow>

              <DetailRow label="Labels">
                <LabelPicker taskId={task.id} />
              </DetailRow>

              <DetailRow label="Domain">
                <Select
                  value={task.domain_id || ""}
                  onValueChange={(v) => saveField("domain_id", v || null)}
                >
                  <SelectTrigger className="w-auto h-7 text-xs border-none shadow-none px-2 gap-1">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {domains.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </DetailRow>

              <DetailRow label="Start date">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 text-xs font-normal px-2",
                        !task.start_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1.5 h-3 w-3" />
                      {task.start_date
                        ? format(new Date(task.start_date), "MMM dd, yyyy")
                        : "None"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={
                        task.start_date ? new Date(task.start_date) : undefined
                      }
                      onSelect={(date) =>
                        saveField("start_date", date?.toISOString() || null)
                      }
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </DetailRow>

              <DetailRow label="Project">
                <Select
                  value={task.project_id || ""}
                  onValueChange={(v) => saveField("project_id", v || null)}
                >
                  <SelectTrigger className="w-auto h-7 text-xs border-none shadow-none px-2 gap-1">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </DetailRow>

              <DetailRow label="Estimate">
                <Input
                  type="number"
                  value={task.estimated_minutes || ""}
                  onChange={(e) =>
                    saveField(
                      "estimated_minutes",
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  placeholder="0 min"
                  className="w-20 h-7 text-xs text-right border-none shadow-none"
                />
              </DetailRow>

              <DetailRow label="Recurrence">
                <RecurrencePicker
                  value={task.recurrence_rule}
                  onChange={(v) =>
                    saveField("recurrence_rule", v === "none" ? null : v)
                  }
                />
              </DetailRow>
            </div>
          </CollapsibleSection>

          <Separator />

          {/* Development section */}
          <CollapsibleSection title="Development" defaultOpen={false}>
            <div className="space-y-2 py-2">
              <button className="flex items-center gap-2 text-sm text-primary hover:underline w-full">
                <Link2 className="h-3.5 w-3.5" />
                Connect development tools
              </button>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <GitBranch className="h-3.5 w-3.5" />
                  Create branch
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <GitCommit className="h-3.5 w-3.5" />
                  Create commit
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </div>
          </CollapsibleSection>

          <Separator />

          {/* Automation section */}
          <CollapsibleSection title="Automation" defaultOpen={false}>
            <div className="space-y-2 py-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Recent rule runs</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Refresh
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Refresh to see recent runs.
              </p>
              <button className="text-sm text-primary hover:underline flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" />
                Create new automation rule
              </button>
            </div>
          </CollapsibleSection>

          <Separator />

          {/* Metadata */}
          <div className="space-y-1 py-2">
            <p className="text-xs text-muted-foreground">
              Created {format(new Date(task.created_at), "MMM d, yyyy")}
            </p>
            {task.completed_at && (
              <p className="text-xs text-muted-foreground">
                Completed {format(new Date(task.completed_at), "MMM d, yyyy")}
              </p>
            )}
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
