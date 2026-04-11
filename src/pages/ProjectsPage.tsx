import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  FolderKanban,
  Calendar,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  MoreHorizontal,
  Kanban,
} from "lucide-react";
import { TaskBoardContent } from "@/components/projects/TaskBoardContent";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { safeFormat } from "@/lib/date-utils";

interface Project {
  id: number;
  title: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
  completedTaskCount?: number;
}

const statusConfig: Record<string, { label: string; color: string; bgClass: string }> = {
  active: {
    label: "Active",
    color: "#10B981",
    bgClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  },
  planning: {
    label: "Planning",
    color: "#6366F1",
    bgClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300",
  },
  on_hold: {
    label: "On Hold",
    color: "#F59E0B",
    bgClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  },
  completed: {
    label: "Completed",
    color: "#6B7280",
    bgClass: "bg-muted text-muted-foreground",
  },
};

function getStatusLabel(status: string) {
  return statusConfig[status]?.label ?? status;
}

function getStatusBgClass(status: string) {
  return statusConfig[status]?.bgClass ?? "bg-muted text-muted-foreground";
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialView = (searchParams.get("view") as "cards" | "list" | "tasks") || "cards";
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<"cards" | "list" | "tasks">(initialView);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    status: "active",
    startDate: "",
    endDate: "",
  });

  const { data: projects = [], isLoading, refetch } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
  });

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        project.title.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: projects.length,
      active: projects.filter((p) => p.status === "active").length,
      planning: projects.filter((p) => p.status === "planning").length,
      completed: projects.filter((p) => p.status === "completed").length,
    };
  }, [projects]);

  const handleCreateProject = async () => {
    if (!newProject.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Project title is required.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: newProject.title,
          description: newProject.description || null,
          status: newProject.status,
          startDate: newProject.startDate || null,
          endDate: newProject.endDate || null,
        }),
      });
      if (!response.ok) throw new Error("Failed to create project");
      toast({ title: "Success", description: "Project created successfully." });
      setShowCreateDialog(false);
      setNewProject({ title: "", description: "", status: "active", startDate: "", endDate: "" });
      refetch();
    } catch {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getProgressPercent = (project: Project) => {
    const total = project.taskCount ?? 0;
    const completed = project.completedTaskCount ?? 0;
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col pb-20 sm:pb-0">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-foreground" />
            <div>
              <h1 className="text-lg font-bold text-foreground">Projects</h1>
              <p className="text-xs text-muted-foreground">
                Organize and track work across your team.
              </p>
            </div>
          </div>

          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[
            { label: "Total", value: stats.total },
            { label: "Active", value: stats.active },
            { label: "Planning", value: stats.planning },
            { label: "Completed", value: stats.completed },
          ].map((stat) => (
            <div
              key={stat.label}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1 text-xs"
            >
              <span className="font-semibold text-foreground">{stat.value}</span>
              <span className="text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* Filters */}
      <div className="flex-shrink-0 border-b border-border bg-card px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects"
              className="h-10 w-full rounded-xl pl-9 pr-3 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.08),inset_-2px_-2px_4px_rgba(255,255,255,0.04)]"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-[165px] rounded-xl border-border bg-background text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 rounded-xl border border-border bg-background px-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-lg h-8 w-8",
                currentView === "cards"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-muted-foreground hover:bg-accent"
              )}
              onClick={() => setCurrentView("cards")}
              aria-label="Card view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-lg h-8 w-8",
                currentView === "list"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-muted-foreground hover:bg-accent"
              )}
              onClick={() => setCurrentView("list")}
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-lg h-8 w-8",
                currentView === "tasks"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-muted-foreground hover:bg-accent"
              )}
              onClick={() => setCurrentView("tasks")}
              aria-label="Task board"
            >
              <Kanban className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="min-h-0 flex-1 overflow-y-auto bg-muted/10 p-4">
        {currentView === "tasks" ? (
          <TaskBoardContent />
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5">
                <Skeleton className="h-5 w-2/3 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-2 w-full mb-3" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "all"
                ? "No projects match your current filters."
                : "No projects yet. Create your first project to get started."}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            )}
          </div>
        ) : currentView === "cards" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => {
              const progress = getProgressPercent(project);
              const totalTasks = project.taskCount ?? 0;
              const completedTasks = project.completedTaskCount ?? 0;
              return (
                <div
                  key={project.id}
                  className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50 cursor-pointer"
                  onClick={() => navigate(`/tasks?project=${project.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-semibold text-foreground line-clamp-1">
                      {project.title}
                    </h2>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                        getStatusBgClass(project.status)
                      )}
                    >
                      {getStatusLabel(project.status)}
                    </span>
                  </div>

                  {project.description && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                      <span>Progress</span>
                      <span>
                        {completedTasks}/{totalTasks} tasks
                      </span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {project.startDate && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {safeFormat(project.startDate, "MMM d, yyyy")}
                      </span>
                    )}
                    {project.endDate && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Due {safeFormat(project.endDate, "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProjects.map((project) => {
              const progress = getProgressPercent(project);
              const totalTasks = project.taskCount ?? 0;
              const completedTasks = project.completedTaskCount ?? 0;
              return (
                <div
                  key={project.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/50 cursor-pointer"
                  onClick={() => navigate(`/tasks?project=${project.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm truncate">{project.title}</h3>
                      <span
                        className={cn(
                          "text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0",
                          getStatusBgClass(project.status)
                        )}
                      >
                        {getStatusLabel(project.status)}
                      </span>
                    </div>
                    {project.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {project.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Progress value={progress} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {completedTasks}/{totalTasks}
                      </span>
                    </div>

                    {project.endDate && (
                      <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{safeFormat(project.endDate, "MMM d")}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="project-title">Title</Label>
              <Input
                id="project-title"
                placeholder="Project name"
                value={newProject.title}
                onChange={(e) =>
                  setNewProject((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                placeholder="Brief description of this project"
                value={newProject.description}
                onChange={(e) =>
                  setNewProject((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-status">Status</Label>
              <Select
                value={newProject.status}
                onValueChange={(val) =>
                  setNewProject((prev) => ({ ...prev, status: val }))
                }
              >
                <SelectTrigger id="project-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="project-start">Start Date</Label>
                <Input
                  id="project-start"
                  type="date"
                  value={newProject.startDate}
                  onChange={(e) =>
                    setNewProject((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-end">End Date</Label>
                <Input
                  id="project-end"
                  type="date"
                  value={newProject.endDate}
                  onChange={(e) =>
                    setNewProject((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
