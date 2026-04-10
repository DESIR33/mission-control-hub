import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { TaskComment } from "@/types/tasks";

// Mention pattern: @[user_id:Display Name]
const MENTION_REGEX = /@\[([a-f0-9-]+):([^\]]+)\]/g;

export function extractMentions(content: string): { userId: string; displayName: string }[] {
  const mentions: { userId: string; displayName: string }[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(MENTION_REGEX.source, "g");
  while ((match = regex.exec(content)) !== null) {
    mentions.push({ userId: match[1], displayName: match[2] });
  }
  return mentions;
}

export function useTaskComments(taskId: string | undefined) {
  const { workspaceId } = useWorkspace();
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
      // 1. Insert the comment
      const { data, error } = await (supabase as any)
        .from("task_comments")
        .insert({
          task_id: taskId,
          workspace_id: workspaceId,
          content,
          author_id: authorId,
        })
        .select()
        .single();
      if (error) throw error;

      // 2. Extract and insert mentions
      const mentions = extractMentions(content);
      if (mentions.length > 0 && workspaceId) {
        const mentionRows = mentions.map((m) => ({
          workspace_id: workspaceId,
          comment_id: data.id,
          mentioned_user_id: m.userId,
          task_id: taskId,
        }));

        await (supabase as any)
          .from("task_comment_mentions")
          .insert(mentionRows);

        // 3. Insert notifications for each mentioned user
        const notifRows = mentions.map((m) => ({
          workspace_id: workspaceId,
          type: "task_mention",
          title: `You were mentioned in a task comment`,
          body: content.length > 120 ? content.slice(0, 120) + "…" : content,
          entity_id: taskId,
          entity_type: "task",
        }));

        try {
          await (supabase as any).from("notifications").insert(notifRows);
        } catch {
          // notifications table may not exist or have different schema — non-critical
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-mentions", taskId] });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("task_comments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-mentions", taskId] });
    },
  });

  return { ...query, comments: query.data ?? [], addComment, deleteComment };
}

export function useUnreadMentionCount(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task-mentions", taskId],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId || !taskId) return 0;

      const { count, error } = await (supabase as any)
        .from("task_comment_mentions")
        .select("id", { count: "exact", head: true })
        .eq("task_id", taskId)
        .eq("mentioned_user_id", userId)
        .eq("read", false);

      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!taskId,
  });
}

export function useMarkMentionsRead(taskId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId || !taskId) return;

      await (supabase as any)
        .from("task_comment_mentions")
        .update({ read: true })
        .eq("task_id", taskId)
        .eq("mentioned_user_id", userId)
        .eq("read", false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-mentions", taskId] });
    },
  });
}
