import { useNavigate } from "react-router-dom";
import { FolderKanban, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTaskProjects } from "@/hooks/use-task-projects";
import { useTaskDomain, TaskDomainProvider } from "@/hooks/use-task-domain";
import { useWorkspace } from "@/hooks/use-workspace";
import { DomainSwitcher } from "@/components/tasks/DomainSwitcher";
import { CreateProjectDialog } from "@/components/tasks/CreateProjectDialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function TaskProjectsContent() {
  const navigate = useNavigate();
  const { activeDomainId, domains } = useTaskDomain();
  const { projects, isLoading, deleteProject } = useTaskProjects(activeDomainId || undefined);
  const { workspaceId } = useWorkspace();

  // Fetch task counts per project
  const { data: taskCounts = {} } = useQuery({
    queryKey: ["project-task-counts", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return {};
      const { data, error } = await (supabase as any)
        .from("tasks")
        .select("project_id, status")
        .eq("workspace_id", workspaceId)
        .not("project_id", "is", null)
        .is("parent_task_id", null);
      if (error) throw error;
      const counts: Record<string, { total: number; done: number }> = {};
      (data || []).forEach((t: any) => {
        if (!counts[t.project_id]) counts[t.project_id] = { total: 0, done: 0 };
        counts[t.project_id].total++;
        if (t.status === "done") counts[t.project_id].done++;
      });
      return counts;
    },
    enabled: !!workspaceId,
  });

  const getDomainName = (domainId: string | null) => {
    const d = domains.find((x) => x.id === domainId);
    return d?.name || "";
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Projects</h1>
          <DomainSwitcher />
        </div>
        <CreateProjectDialog />
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm py-20 text-center">Loading...</div>
      ) : !projects.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FolderKanban className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">No projects yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const counts = taskCounts[project.id] || { total: 0, done: 0 };
            const pct = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
            return (
              <div
                key={project.id}
                onClick={() => navigate(`/tasks/projects/${project.id}`)}
                className="p-4 rounded-xl border bg-card hover:border-primary cursor-pointer transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color || "#6366f1" }} />
                    <h3 className="font-semibold text-sm">{project.name}</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-medium border",
                      project.status === "active" ? "border-green-500/30 text-green-400" :
                      project.status === "completed" ? "border-blue-500/30 text-blue-400" :
                      "border-muted-foreground/30 text-muted-foreground"
                    )}>
                      {project.status}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${project.name}"? This cannot be undone.`)) {
                          deleteProject.mutate(project.id, {
                            onSuccess: () => toast.success("Project deleted"),
                            onError: (err: Error) => toast.error(err.message),
                          });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {project.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{getDomainName(project.domain_id)}</span>
                    <span>{counts.done}/{counts.total} tasks</span>
                  </div>
                  {counts.total > 0 && (
                    <Progress value={pct} className="h-1.5" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TaskProjectsPage() {
  return (
    <TaskDomainProvider>
      <TaskProjectsContent />
    </TaskDomainProvider>
  );
}
