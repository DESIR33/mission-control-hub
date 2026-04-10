import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { List, Grid, Calendar, Inbox, Search, Table, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/use-tasks";
import { useTaskDomain, TaskDomainProvider } from "@/hooks/use-task-domain";
import { useTaskKeyboardShortcuts } from "@/hooks/useTaskKeyboardShortcuts";
import { DomainSwitcher } from "@/components/tasks/DomainSwitcher";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskListView } from "@/components/tasks/TaskListView";
import { TaskKanbanView } from "@/components/tasks/TaskKanbanView";
import { TaskCalendarView } from "@/components/tasks/TaskCalendarView";
import { TaskInboxView } from "@/components/tasks/TaskInboxView";
import { TaskTableView } from "@/components/tasks/TaskTableView";
import { TaskFiltersBar } from "@/components/tasks/TaskFiltersBar";
import { TemplateManager } from "@/components/tasks/TemplateComponents";
import { SavedViewsBar } from "@/components/tasks/SavedViewsBar";
import type { Task, TaskFilters, TaskStatus, TaskPriority } from "@/types/tasks";

type ViewType = "list" | "board" | "calendar" | "inbox" | "table";
type GroupBy = "none" | "status" | "priority" | "domain" | "project";

const groupByLabels: Record<GroupBy, string> = {
  none: "No grouping",
  status: "Status",
  priority: "Priority",
  domain: "Domain",
  project: "Project",
};

const statusLabels: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

const priorityLabels: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

function groupTasks(tasks: Task[], groupBy: GroupBy, domains: any[], projects: any[]): { key: string; label: string; tasks: Task[] }[] {
  if (groupBy === "none") return [{ key: "all", label: "", tasks }];

  const groups: Record<string, { label: string; tasks: Task[] }> = {};

  for (const task of tasks) {
    let key: string;
    let label: string;

    if (groupBy === "status") {
      key = task.status;
      label = statusLabels[task.status] || task.status;
    } else if (groupBy === "priority") {
      key = task.priority;
      label = priorityLabels[task.priority] || task.priority;
    } else if (groupBy === "domain") {
      key = task.domain_id || "none";
      label = domains.find((d) => d.id === task.domain_id)?.name || "No Domain";
    } else {
      key = task.project_id || "none";
      label = projects.find((p) => p.id === task.project_id)?.name || "No Project";
    }

    if (!groups[key]) groups[key] = { label, tasks: [] };
    groups[key].tasks.push(task);
  }

  // Sort groups in a logical order
  const entries = Object.entries(groups).map(([key, val]) => ({ key, ...val }));
  if (groupBy === "priority") {
    const order = { urgent: 0, high: 1, medium: 2, low: 3 };
    entries.sort((a, b) => (order[a.key as TaskPriority] ?? 99) - (order[b.key as TaskPriority] ?? 99));
  } else if (groupBy === "status") {
    const order = { todo: 0, in_progress: 1, done: 2, cancelled: 3 };
    entries.sort((a, b) => (order[a.key as TaskStatus] ?? 99) - (order[b.key as TaskStatus] ?? 99));
  }

  return entries;
}

function GroupedView({
  groups,
  view,
  onTaskClick,
}: {
  groups: { key: string; label: string; tasks: Task[] }[];
  view: ViewType;
  onTaskClick: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  if (groups.length === 1 && groups[0].key === "all") {
    return <ViewRenderer view={view} tasks={groups[0].tasks} onTaskClick={onTaskClick} />;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.key} className="space-y-2">
          <button
            onClick={() => setCollapsed((prev) => {
              const next = new Set(prev);
              if (next.has(group.key)) next.delete(group.key);
              else next.add(group.key);
              return next;
            })}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            {collapsed.has(group.key) ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {group.label}
            <span className="text-xs font-normal bg-muted px-1.5 py-0.5 rounded-full">{group.tasks.length}</span>
          </button>
          {!collapsed.has(group.key) && (
            <ViewRenderer view={view} tasks={group.tasks} onTaskClick={onTaskClick} />
          )}
        </div>
      ))}
    </div>
  );
}

function ViewRenderer({ view, tasks, onTaskClick }: { view: ViewType; tasks: Task[]; onTaskClick: (id: string) => void }) {
  if (view === "list") return <TaskListView tasks={tasks} onTaskClick={onTaskClick} />;
  if (view === "board") return <TaskKanbanView tasks={tasks} onTaskClick={onTaskClick} />;
  if (view === "calendar") return <TaskCalendarView tasks={tasks} onTaskClick={onTaskClick} />;
  if (view === "inbox") return <TaskInboxView tasks={tasks} onTaskClick={onTaskClick} />;
  if (view === "table") return <TaskTableView tasks={tasks} onTaskClick={onTaskClick} />;
  return null;
}

function TasksPageContent({ defaultView = "list" }: { defaultView?: ViewType }) {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewType>(defaultView);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority[]>([]);
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const { activeDomainId, domains } = useTaskDomain();
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  useTaskKeyboardShortcuts();

  const handleApplyView = useCallback((savedView: any) => {
    if (savedView.config?.view) setView(savedView.config.view);
    if (savedView.config?.status) setStatusFilter(savedView.config.status);
    if (savedView.config?.priority) setPriorityFilter(savedView.config.priority);
    if (savedView.config?.search) setSearch(savedView.config.search);
    setActiveViewId(savedView.id);
  }, []);

  const handleClearView = useCallback(() => {
    setActiveViewId(null);
  }, []);

  // Get projects for grouping labels
  const { tasks: allProjects } = useTasks({ parent_task_id: null });
  // We'll use a simple approach - projects from task data
  const projectsFromTasks = useMemo(() => {
    const map = new Map<string, string>();
    allProjects.forEach((t) => {
      if (t.project_id && t.project) map.set(t.project_id, t.project.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allProjects]);

  const filters: TaskFilters = useMemo(() => ({
    domain_id: activeDomainId || undefined,
    search: search || undefined,
    parent_task_id: null,
    status: statusFilter.length ? statusFilter : undefined,
    priority: priorityFilter.length ? priorityFilter : undefined,
    label_ids: labelFilter.length ? labelFilter : undefined,
    ...(view === "inbox" ? { is_inbox: true } : {}),
  }), [activeDomainId, search, view, statusFilter, priorityFilter, labelFilter]);

  const { tasks, isLoading } = useTasks(filters);

  const groups = useMemo(
    () => groupTasks(tasks, groupBy, domains, projectsFromTasks),
    [tasks, groupBy, domains, projectsFromTasks]
  );

  const views: { id: ViewType; icon: any; label: string }[] = [
    { id: "inbox", icon: Inbox, label: "Inbox" },
    { id: "list", icon: List, label: "List" },
    { id: "board", icon: Grid, label: "Board" },
    { id: "table", icon: Table, label: "Table" },
    { id: "calendar", icon: Calendar, label: "Calendar" },
  ];

  const onTaskClick = (id: string) => navigate(`/tasks/${id}`);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-bold">Tasks</h1>
          <DomainSwitcher />
          <TemplateManager />
        </div>
        <div className="flex items-center gap-1">
          {views.map((v) => (
            <Button
              key={v.id}
              variant="ghost"
              size="sm"
              onClick={() => { setView(v.id); setActiveViewId(null); }}
              className={cn(
                "gap-1.5",
                view === v.id && "bg-primary text-primary-foreground"
              )}
            >
              <v.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{v.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Saved Views */}
      <SavedViewsBar
        currentView={view}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        search={search}
        activeDomainId={activeDomainId}
        activeViewId={activeViewId}
        onApplyView={handleApplyView}
        onClearView={handleClearView}
      />

      {/* Quick Add + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <QuickAddTask />
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setActiveViewId(null); }}
            placeholder="Search tasks..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Filters + Group By */}
      {view !== "inbox" && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TaskFiltersBar
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            priorityFilter={priorityFilter}
            onPriorityChange={setPriorityFilter}
            labelFilter={labelFilter}
            onLabelChange={setLabelFilter}
          />
          {view !== "calendar" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Group:</span>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                <SelectTrigger className="h-7 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No grouping</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="domain">Domain</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading tasks...</div>
      ) : (
        <GroupedView groups={groups} view={view} onTaskClick={onTaskClick} />
      )}
    </div>
  );
}

export default function TasksPage({ defaultView }: { defaultView?: ViewType }) {
  return (
    <TaskDomainProvider>
      <TasksPageContent defaultView={defaultView} />
    </TaskDomainProvider>
  );
}
