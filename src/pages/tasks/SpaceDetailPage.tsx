import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, Briefcase, Layers, List, Grid, Calendar, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useSpaceStats } from "@/hooks/use-space-stats";
import { useTasks } from "@/hooks/use-tasks";
import { SpaceSummaryCard } from "@/components/spaces/SpaceSummaryCard";
import { TaskListView } from "@/components/tasks/TaskListView";
import { TaskKanbanView } from "@/components/tasks/TaskKanbanView";
import { TaskCalendarView } from "@/components/tasks/TaskCalendarView";
import { TaskEditDialog } from "@/components/spaces/TaskEditDialog";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import type { Task, TaskFilters } from "@/types/tasks";

const domainIcons: Record<string, typeof Shield> = {
  Shield: Shield,
  Briefcase: Briefcase,
};

export default function SpaceDetailPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const { data: spaces = [], isLoading: statsLoading } = useSpaceStats();
  const [activeTab, setActiveTab] = useState("summary");
  const [search, setSearch] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const space = spaces.find((s) => s.domain_id === spaceId);

  const filters: TaskFilters = useMemo(() => ({
    domain_id: spaceId || undefined,
    search: search || undefined,
    parent_task_id: null,
  }), [spaceId, search]);

  const { tasks, isLoading: tasksLoading } = useTasks(filters);

  const handleTaskClick = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setEditingTask(task);
    } else {
      navigate(`/tasks/${taskId}`);
    }
  };

  if (statsLoading) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (!space) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Space not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/tasks/spaces")}>
          Back to Spaces
        </Button>
      </div>
    );
  }

  const Icon = domainIcons[space.domain_icon || ""] || Layers;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/tasks/spaces")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg"
            style={{ backgroundColor: space.domain_color ? `${space.domain_color}20` : undefined }}
          >
            <Icon className="w-5 h-5" style={{ color: space.domain_color || undefined }} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Spaces</p>
            <h1 className="text-xl font-bold text-foreground">{space.domain_name}</h1>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="summary" className="gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Summary
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5">
              <List className="w-3.5 h-3.5" /> List
            </TabsTrigger>
            <TabsTrigger value="board" className="gap-1.5">
              <Grid className="w-3.5 h-3.5" /> Board
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Calendar
            </TabsTrigger>
          </TabsList>

          {activeTab !== "summary" && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="pl-9"
              />
            </div>
          )}
        </div>

        {activeTab !== "summary" && (
          <div className="mt-3">
            <QuickAddTask defaultDomainId={spaceId} />
          </div>
        )}

        <TabsContent value="summary" className="mt-4">
          <SpaceSummaryCard space={space} />
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          {tasksLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <TaskListView tasks={tasks} onTaskClick={handleTaskClick} />
          )}
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          {tasksLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <TaskKanbanView tasks={tasks} onTaskClick={handleTaskClick} />
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          {tasksLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <TaskCalendarView tasks={tasks} onTaskClick={handleTaskClick} />
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <TaskEditDialog
        task={editingTask}
        open={!!editingTask}
        onOpenChange={(open) => { if (!open) setEditingTask(null); }}
      />
    </div>
  );
}
