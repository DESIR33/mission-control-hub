import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  related_task: {
    id: string;
    title: string;
    status: string;
  };
}

export function useTaskDependencies(taskId: string | undefined) {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();

  const { data: blockedBy = [], isLoading: loadingBlockedBy } = useQuery({
    queryKey: ["task-dependencies", "blocked-by", taskId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("task_dependencies")
        .select("id, task_id, depends_on_task_id, depends_on_task:tasks!task_dependencies_depends_on_task_id_fkey(id, title, status)")
        .eq("task_id", taskId);
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        task_id: d.task_id,
        depends_on_task_id: d.depends_on_task_id,
        related_task: d.depends_on_task,
      })) as TaskDependency[];
    },
    enabled: !!taskId,
  });

  const { data: blocking = [], isLoading: loadingBlocking } = useQuery({
    queryKey: ["task-dependencies", "blocking", taskId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("task_dependencies")
        .select("id, task_id, depends_on_task_id, blocked_task:tasks!task_dependencies_task_id_fkey(id, title, status)")
        .eq("depends_on_task_id", taskId);
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        task_id: d.task_id,
        depends_on_task_id: d.depends_on_task_id,
        related_task: d.blocked_task,
      })) as TaskDependency[];
    },
    enabled: !!taskId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["task-dependencies"] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  const addDependency = useMutation({
    mutationFn: async (dependsOnTaskId: string) => {
      const { error } = await (supabase as any)
        .from("task_dependencies")
        .insert({
          workspace_id: workspaceId,
          task_id: taskId,
          depends_on_task_id: dependsOnTaskId,
        });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeDependency = useMutation({
    mutationFn: async (dependencyId: string) => {
      const { error } = await (supabase as any)
        .from("task_dependencies")
        .delete()
        .eq("id", dependencyId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const isBlocked = blockedBy.some(
    (d) => d.related_task.status !== "done"
  );

  return {
    blockedBy,
    blocking,
    isBlocked,
    isLoading: loadingBlockedBy || loadingBlocking,
    addDependency,
    removeDependency,
  };
}

/** Batch check: which task IDs are blocked? */
export function useBlockedTaskIds(taskIds: string[]) {
  const { data: blockedIds = new Set<string>() } = useQuery({
    queryKey: ["task-dependencies", "blocked-ids", taskIds.sort().join(",")],
    queryFn: async () => {
      if (!taskIds.length) return new Set<string>();
      const { data, error } = await (supabase as any)
        .from("task_dependencies")
        .select("task_id, depends_on_task:tasks!task_dependencies_depends_on_task_id_fkey(status)")
        .in("task_id", taskIds);
      if (error) throw error;
      const blocked = new Set<string>();
      for (const dep of data || []) {
        if (dep.depends_on_task?.status !== "done") {
          blocked.add(dep.task_id);
        }
      }
      return blocked;
    },
    enabled: taskIds.length > 0,
  });
  return blockedIds;
}
