import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { TaskComment } from "@/types/tasks";

export function useTaskComments(taskId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await (supabase as any)
        .from("task_comments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as TaskComment[];
    },
    enabled: !!taskId,
  });

  const addComment = useMutation({
    mutationFn: async ({ content, authorId }: { content: string; authorId: string }) => {
      const { data, error } = await (supabase as any)
        .from("task_comments")
        .insert({ task_id: taskId, workspace_id: wsId, content, author_id: authorId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] }),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("task_comments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] }),
  });

  return { ...query, comments: query.data ?? [], addComment, deleteComment };
}
