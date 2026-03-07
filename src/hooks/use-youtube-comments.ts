import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

export interface YouTubeComment {
  id: string;
  workspace_id: string;
  video_id: string;
  video_title: string;
  comment_id: string;
  author_name: string;
  author_channel_id: string | null;
  author_profile_url: string | null;
  text: string;
  like_count: number;
  reply_count: number;
  published_at: string;
  sentiment: "positive" | "negative" | "question" | "neutral";
  priority: "high" | "medium" | "low";
  is_replied: boolean;
  suggested_reply: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export function useYouTubeComments(videoId?: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["youtube_comments", workspaceId, videoId],
    queryFn: async (): Promise<YouTubeComment[]> => {
      let query = supabase
        .from("youtube_comments" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("published_at", { ascending: false });
      if (videoId) query = query.eq("video_id", videoId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as YouTubeComment[];
    },
    enabled: !!workspaceId,
  });
}

export function useSyncComments() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke(
        "youtube-comments-sync",
        { body: { workspace_id: workspaceId } }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["youtube_comments", workspaceId] });
      toast.success("Comments synced successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to sync comments: " + error.message);
    },
  });
}

export function useGenerateReply() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { commentId: string; comment_text: string; video_title: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke(
        "ai-generate-proposals",
        {
          body: {
            workspace_id: workspaceId,
            type: "comment_reply",
            context: {
              comment_text: input.comment_text,
              video_title: input.video_title,
            },
          },
        }
      );
      if (error) throw error;
      if (data?.reply) {
        await supabase
          .from("youtube_comments" as any)
          .update({ suggested_reply: data.reply } as any)
          .eq("id", input.commentId);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["youtube_comments", workspaceId] });
      toast.success("Reply generated");
    },
    onError: (error: Error) => {
      toast.error("Failed to generate reply: " + error.message);
    },
  });
}

export function useMarkReplied() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("youtube_comments" as any)
        .update({ is_replied: true, updated_at: new Date().toISOString() } as any)
        .eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["youtube_comments", workspaceId] });
      toast.success("Comment marked as replied");
    },
    onError: (error: Error) => {
      toast.error("Failed to update comment: " + error.message);
    },
  });
}

export function useUpdateCommentStatus() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; sentiment?: string; priority?: string; is_replied?: boolean; is_pinned?: boolean }) => {
      const { error } = await supabase
        .from("youtube_comments" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["youtube_comments", workspaceId] });
    },
  });
}

export function useCommentStats() {
  const { data: comments, isLoading } = useYouTubeComments();
  const stats = {
    total: comments?.length ?? 0,
    unreplied: comments?.filter((c) => !c.is_replied).length ?? 0,
    questions: comments?.filter((c) => c.sentiment === "question").length ?? 0,
    highPriority: comments?.filter((c) => c.priority === "high").length ?? 0,
  };
  return { stats, isLoading };
}
