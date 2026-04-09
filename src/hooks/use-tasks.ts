import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { Task, TaskFilters, TaskStatus } from "@/types/tasks";

export function useTasks(filters?: TaskFilters) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tasks", wsId, filters],
    queryFn: async () => {
      if (!wsId) return [];
      let q = (supabase as any)
        .from("tasks")
        .select("*")
        .eq("workspace_id", wsId)
        .order("sort_order")
        .order("created_at", { ascending: false });

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

      const { data, error } = await q;
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!wsId,
  });

  const createTask = useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const { data, error } = await (supabase as any)
        .from("tasks")
        .insert({ ...task, workspace_id: wsId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      // Auto-set completed_at
      if (updates.status === "done" && !updates.completed_at) {
        updates.completed_at = new Date().toISOString();
      }
      if (updates.status && updates.status !== "done") {
        updates.completed_at = null;
      }
      const { data, error } = await (supabase as any)
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("tasks")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return { ...query, tasks: query.data ?? [], createTask, updateTask, deleteTask };
}

export function useSubtasks(parentTaskId: string | undefined) {
  return useTasks(parentTaskId ? { parent_task_id: parentTaskId } : undefined);
}
