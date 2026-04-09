import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { TaskLabel } from "@/types/tasks";

export function useTaskLabels() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["task-labels", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await (supabase as any).from("task_labels").select("*").eq("workspace_id", workspaceId).order("name");
      if (error) throw error;
      return data as TaskLabel[];
    },
    enabled: !!workspaceId,
  });

  const createLabel = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { data, error } = await (supabase as any).from("task_labels").insert({ workspace_id: workspaceId, name, color }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task-labels"] }),
  });

  const toggleLabel = useMutation({
    mutationFn: async ({ taskId, labelId, assigned }: { taskId: string; labelId: string; assigned: boolean }) => {
      if (assigned) {
        const { error } = await (supabase as any).from("task_label_assignments").delete().eq("task_id", taskId).eq("label_id", labelId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("task_label_assignments").insert({ task_id: taskId, label_id: labelId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-label-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return { ...query, labels: query.data ?? [], createLabel, toggleLabel };
}

export function useTaskLabelAssignments(taskId: string | undefined) {
  const query = useQuery({
    queryKey: ["task-label-assignments", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await (supabase as any).from("task_label_assignments").select("*, label:task_labels(*)").eq("task_id", taskId);
      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });
  return { ...query, assignments: query.data ?? [] };
}
