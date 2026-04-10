import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { TaskFilters, TaskStatus, TaskPriority } from "@/types/tasks";

export interface SavedViewSortConfig {
  sort_by?: string;
  direction?: "asc" | "desc";
}

export interface TaskSavedView {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  icon: string | null;
  view_type: "list" | "board" | "calendar" | "inbox";
  filters: TaskFilters;
  sort_config: SavedViewSortConfig;
  group_by: string | null;
  is_pinned: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useTaskSavedViews() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const queryKey = ["task-saved-views", workspaceId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await (supabase as any)
        .from("task_saved_views")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("is_pinned", { ascending: false })
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data as TaskSavedView[];
    },
    enabled: !!workspaceId,
  });

  const createView = useMutation({
    mutationFn: async (view: Omit<TaskSavedView, "id" | "workspace_id" | "user_id" | "created_at" | "updated_at">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await (supabase as any)
        .from("task_saved_views")
        .insert({ ...view, workspace_id: workspaceId, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as TaskSavedView;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateView = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TaskSavedView> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("task_saved_views")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as TaskSavedView;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteView = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("task_saved_views")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      const { data, error } = await (supabase as any)
        .from("task_saved_views")
        .update({ is_pinned })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as TaskSavedView;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    ...query,
    views: query.data ?? [],
    createView,
    updateView,
    deleteView,
    togglePin,
  };
}
