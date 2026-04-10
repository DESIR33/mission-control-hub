import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { Task, TaskFilters } from "@/types/tasks";

export function useTasks(filters?: TaskFilters) {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tasks", workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return [];
      let q = (supabase as any).from("tasks").select("*").eq("workspace_id", workspaceId).order("sort_order").order("created_at", { ascending: false });

      if (filters?.domain_id) q = q.eq("domain_id", filters.domain_id);
      if (filters?.project_id) q = q.eq("project_id", filters.project_id);
      if (filters?.is_inbox !== undefined) q = q.eq("is_inbox", filters.is_inbox);
      if (filters?.parent_task_id !== undefined) {
        if (filters.parent_task_id === null) q = q.is("parent_task_id", null);
        else q = q.eq("parent_task_id", filters.parent_task_id);
      }
      if (filters?.status?.length) q = q.in("status", filters.status);
      if (filters?.priority?.length) q = q.in("priority", filters.priority);
      if (filters?.search) q = q.ilike("title", `%${filters.search}%`);
      if (filters?.due_before) q = q.lte("due_date", filters.due_before);
      if (filters?.due_after) q = q.gte("due_date", filters.due_after);

      let { data, error } = await q;

      // Client-side label filter (requires join which is complex in Supabase query builder)
      if (!error && data && filters?.label_ids?.length) {
        const labelIds = filters.label_ids;
        const { data: assignments } = await (supabase as any)
          .from("task_label_assignments")
          .select("task_id")
          .in("label_id", labelIds);
        if (assignments) {
          const taskIdsWithLabels = new Set(assignments.map((a: any) => a.task_id));
          data = data.filter((t: Task) => taskIdsWithLabels.has(t.id));
        }
      }
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!workspaceId,
  });

  const createTask = useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const { data, error } = await (supabase as any).from("tasks").insert({ ...task, workspace_id: workspaceId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      if (updates.status === "done" && !updates.completed_at) updates.completed_at = new Date().toISOString();
      if (updates.status && updates.status !== "done") updates.completed_at = null;
      const { data, error } = await (supabase as any).from("tasks").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return { ...query, tasks: query.data ?? [], createTask, updateTask, deleteTask };
}

export function useSubtasks(parentTaskId: string | undefined) {
  return useTasks(parentTaskId ? { parent_task_id: parentTaskId } : undefined);
}
