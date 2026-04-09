import { useNavigate } from "react-router-dom";
import { FolderKanban } from "lucide-react";
import { useTaskProjects } from "@/hooks/use-task-projects";
import { useTaskDomain, TaskDomainProvider } from "@/hooks/use-task-domain";
import { DomainSwitcher } from "@/components/tasks/DomainSwitcher";
import { CreateProjectDialog } from "@/components/tasks/CreateProjectDialog";
import { cn } from "@/lib/utils";

function TaskProjectsContent() {
  const navigate = useNavigate();
  const { activeDomainId, domains } = useTaskDomain();
  const { projects, isLoading } = useTaskProjects(activeDomainId || undefined);

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
          {projects.map((project) => (
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
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-medium border",
                  project.status === "active" ? "border-green-500/30 text-green-400" :
                  project.status === "completed" ? "border-blue-500/30 text-blue-400" :
                  "border-muted-foreground/30 text-muted-foreground"
                )}>
                  {project.status}
                </span>
              </div>
              {project.description && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
              )}
              <div className="text-xs text-muted-foreground">
                {getDomainName(project.domain_id)}
              </div>
            </div>
          ))}
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
