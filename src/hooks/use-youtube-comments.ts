import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface YouTubeComment {
  id: string;
  workspace_id: string;
  youtube_comment_id: string;
  youtube_video_id: string;
  video_title: string | null;
  author_name: string;
  author_channel_url: string | null;
  author_avatar_url: string | null;
  text_display: string;
  like_count: number;
  reply_count: number;
  is_pinned: boolean;
  is_hearted: boolean;
  our_reply: string | null;
  sentiment: "positive" | "neutral" | "negative" | "question" | null;
  status: "unread" | "read" | "replied" | "flagged";
  published_at: string;
  synced_at: string;
}

export interface CommentFilters {
  videoId?: string;
  status?: string;
  sentiment?: string;
}

export function useYouTubeComments(filters?: CommentFilters) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["youtube-comments", workspaceId, filters],
    queryFn: async (): Promise<YouTubeComment[]> => {
      let query = supabase
        .from("youtube_comments" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("published_at", { ascending: false })
        .limit(200);

      if (filters?.videoId) query = query.eq("youtube_video_id", filters.videoId);
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.sentiment) query = query.eq("sentiment", filters.sentiment);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as YouTubeComment[];
    },
    enabled: !!workspaceId,
  });
}

export function useCommentStats() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["youtube-comment-stats", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_comments" as any)
        .select("status, sentiment")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;

      const comments = (data ?? []) as any[];
      const total = comments.length;
      const unread = comments.filter((c) => c.status === "unread").length;
      const replied = comments.filter((c) => c.status === "replied").length;
      const flagged = comments.filter((c) => c.status === "flagged").length;
      const positive = comments.filter((c) => c.sentiment === "positive").length;
      const negative = comments.filter((c) => c.sentiment === "negative").length;
      const questions = comments.filter((c) => c.sentiment === "question").length;
      const replyRate = total > 0 ? (replied / total) * 100 : 0;

      return { total, unread, replied, flagged, positive, negative, questions, replyRate };
    },
    enabled: !!workspaceId,
  });
}

export function useUpdateCommentStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, ourReply }: { id: string; status: string; ourReply?: string }) => {
      const updates: Record<string, unknown> = { status };
      if (ourReply !== undefined) updates.our_reply = ourReply;
      const { error } = await supabase
        .from("youtube_comments" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["youtube-comments"] });
      qc.invalidateQueries({ queryKey: ["youtube-comment-stats"] });
    },
  });
}
