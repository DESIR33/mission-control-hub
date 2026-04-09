import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { TaskProject } from "@/types/tasks";

export function useTaskProjects(domainId?: string | null) {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["task-projects", workspaceId, domainId],
    queryFn: async () => {
      if (!workspaceId) return [];
      let q = (supabase as any).from("task_projects").select("*").eq("workspace_id", workspaceId).order("sort_order");
      if (domainId) q = q.eq("domain_id", domainId);
      const { data, error } = await q;
      if (error) throw error;
      return data as TaskProject[];
    },
    enabled: !!workspaceId,
  });

  const createProject = useMutation({
    mutationFn: async (project: Partial<TaskProject>) => {
      const { data, error } = await (supabase as any).from("task_projects").insert({ ...project, workspace_id: workspaceId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task-projects"] }),
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TaskProject> & { id: string }) => {
      const { data, error } = await (supabase as any).from("task_projects").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task-projects"] }),
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("task_projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task-projects"] }),
  });

  return { ...query, projects: query.data ?? [], createProject, updateProject, deleteProject };
}
