import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { List, Grid, Calendar, Inbox, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { TaskFiltersBar } from "@/components/tasks/TaskFiltersBar";
import type { TaskFilters, TaskStatus, TaskPriority } from "@/types/tasks";

type ViewType = "list" | "board" | "calendar" | "inbox";

function TasksPageContent({ defaultView = "list" }: { defaultView?: ViewType }) {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewType>(defaultView);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority[]>([]);
  const { activeDomainId } = useTaskDomain();
  useTaskKeyboardShortcuts();

  const filters: TaskFilters = useMemo(() => ({
    domain_id: activeDomainId || undefined,
    search: search || undefined,
    parent_task_id: null,
    status: statusFilter.length ? statusFilter : undefined,
    priority: priorityFilter.length ? priorityFilter : undefined,
    ...(view === "inbox" ? { is_inbox: true } : {}),
  }), [activeDomainId, search, view, statusFilter, priorityFilter]);

  const { tasks, isLoading } = useTasks(filters);

  const views: { id: ViewType; icon: any; label: string }[] = [
    { id: "inbox", icon: Inbox, label: "Inbox" },
    { id: "list", icon: List, label: "List" },
    { id: "board", icon: Grid, label: "Board" },
    { id: "calendar", icon: Calendar, label: "Calendar" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-bold">Tasks</h1>
          <DomainSwitcher />
        </div>
        <div className="flex items-center gap-1">
          {views.map((v) => (
            <Button
              key={v.id}
              variant="ghost"
              size="sm"
              onClick={() => setView(v.id)}
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

      {/* Quick Add + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <QuickAddTask />
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Filters */}
      {view !== "inbox" && (
        <TaskFiltersBar
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityChange={setPriorityFilter}
        />
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading tasks...</div>
      ) : (
        <>
          {view === "list" && <TaskListView tasks={tasks} onTaskClick={(id) => navigate(`/tasks/${id}`)} />}
          {view === "board" && <TaskKanbanView tasks={tasks} onTaskClick={(id) => navigate(`/tasks/${id}`)} />}
          {view === "calendar" && <TaskCalendarView tasks={tasks} onTaskClick={(id) => navigate(`/tasks/${id}`)} />}
          {view === "inbox" && <TaskInboxView tasks={tasks} onTaskClick={(id) => navigate(`/tasks/${id}`)} />}
        </>
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
