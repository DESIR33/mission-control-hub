import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskDomainProvider } from "@/hooks/use-task-domain";
import { useTasks } from "@/hooks/use-tasks";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskListView } from "@/components/tasks/TaskListView";
import type { TaskProject } from "@/types/tasks";

function ProjectDetailContent() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { data: project } = useQuery({
    queryKey: ["task-project", projectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("task_projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data as TaskProject;
    },
    enabled: !!projectId,
  });

  const { tasks, isLoading } = useTasks({ project_id: projectId || undefined, parent_task_id: null });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tasks/projects")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          {project?.color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />}
          <h1 className="text-2xl font-bold">{project?.name || "Project"}</h1>
        </div>
      </div>

      {project?.description && (
        <p className="text-sm text-muted-foreground">{project.description}</p>
      )}

      <QuickAddTask projectId={projectId} />

      {isLoading ? (
        <div className="text-muted-foreground text-sm py-10 text-center">Loading...</div>
      ) : (
        <TaskListView tasks={tasks} onTaskClick={(id) => navigate(`/tasks/${id}`)} />
      )}
    </div>
  );
}

export default function TaskProjectDetailPage() {
  return (
    <TaskDomainProvider>
      <ProjectDetailContent />
    </TaskDomainProvider>
  );
}
