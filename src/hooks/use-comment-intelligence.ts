import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { getFreshness } from "@/config/data-freshness";
import { useMemo } from "react";

export interface YouTubeComment {
  id: string;
  workspace_id: string;
  youtube_video_id: string;
  video_title: string | null;
  comment_id: string;
  author_name: string;
  author_avatar: string | null;
  text: string;
  like_count: number;
  sentiment: string | null;
  our_reply: string | null;
  published_at: string;
  created_at: string;
}

export interface ReplyQueueItem extends YouTubeComment {}

export interface TopicIdea {
  comment: YouTubeComment;
  matchedKeyword: string;
}

export interface TopFan {
  author_name: string;
  author_avatar: string | null;
  total_comments: number;
  total_likes: number;
}

export interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
  question: number;
}

export interface VideoSentiment {
  video_title: string;
  youtube_video_id: string;
  positive: number;
  neutral: number;
  negative: number;
  question: number;
  total: number;
}

const TOPIC_KEYWORDS = [
  "make a video",
  "can you do",
  "tutorial on",
  "please cover",
  "video about",
  "would love to see",
  "can you make",
  "do a video",
  "video on",
  "teach us",
  "how to",
  "could you show",
  "idea:",
  "suggestion:",
  "request:",
];

export function useCommentIntelligence() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  const commentsQuery = useQuery({
    queryKey: ["youtube-comments-intel", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_comments" as any)
        .select("id,workspace_id,youtube_video_id,video_title,comment_id,author_name,author_avatar,text,like_count,sentiment,our_reply,published_at,created_at")
        .eq("workspace_id", workspaceId!)
        .order("published_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as YouTubeComment[];
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
  });

  const comments = commentsQuery.data ?? [];

  // Reply Queue: unanswered questions or high-engagement comments
  const replyQueue = useMemo((): ReplyQueueItem[] => {
    return comments
      .filter(
        (c) =>
          !c.our_reply &&
          (c.sentiment === "question" || c.like_count > 5)
      )
      .sort((a, b) => b.like_count - a.like_count);
  }, [comments]);

  // Topic Ideas: comments mentioning video requests
  const topicIdeas = useMemo((): TopicIdea[] => {
    return comments
      .filter((c) => {
        const lower = c.text.toLowerCase();
        return TOPIC_KEYWORDS.some((kw) => lower.includes(kw)) || c.sentiment === "question";
      })
      .map((c) => {
        const lower = c.text.toLowerCase();
        const matched = TOPIC_KEYWORDS.find((kw) => lower.includes(kw)) ?? "question";
        return { comment: c, matchedKeyword: matched };
      })
      .sort((a, b) => b.comment.like_count - a.comment.like_count)
      .slice(0, 50);
  }, [comments]);

  // Top Fans: most frequent commenters
  const topFans = useMemo((): TopFan[] => {
    const fanMap = new Map<
      string,
      { author_avatar: string | null; total_comments: number; total_likes: number }
    >();

    comments.forEach((c) => {
      const existing = fanMap.get(c.author_name) ?? {
        author_avatar: c.author_avatar,
        total_comments: 0,
        total_likes: 0,
      };
      existing.total_comments += 1;
      existing.total_likes += c.like_count;
      if (c.author_avatar) existing.author_avatar = c.author_avatar;
      fanMap.set(c.author_name, existing);
    });

    return Array.from(fanMap.entries())
      .map(([name, data]) => ({ author_name: name, ...data }))
      .sort((a, b) => b.total_comments - a.total_comments)
      .slice(0, 20);
  }, [comments]);

  // Sentiment distribution
  const sentimentDistribution = useMemo((): SentimentDistribution => {
    const dist = { positive: 0, neutral: 0, negative: 0, question: 0 };
    comments.forEach((c) => {
      const s = c.sentiment?.toLowerCase() ?? "neutral";
      if (s === "positive") dist.positive++;
      else if (s === "negative") dist.negative++;
      else if (s === "question") dist.question++;
      else dist.neutral++;
    });
    return dist;
  }, [comments]);

  // Per-video sentiment
  const videoSentiments = useMemo((): VideoSentiment[] => {
    const videoMap = new Map<
      string,
      { video_title: string; positive: number; neutral: number; negative: number; question: number; total: number }
    >();

    comments.forEach((c) => {
      const vid = c.youtube_video_id;
      const existing = videoMap.get(vid) ?? {
        video_title: c.video_title ?? "Untitled",
        positive: 0,
        neutral: 0,
        negative: 0,
        question: 0,
        total: 0,
      };
      const s = c.sentiment?.toLowerCase() ?? "neutral";
      if (s === "positive") existing.positive++;
      else if (s === "negative") existing.negative++;
      else if (s === "question") existing.question++;
      else existing.neutral++;
      existing.total++;
      videoMap.set(vid, existing);
    });

    return Array.from(videoMap.entries())
      .map(([id, data]) => ({ youtube_video_id: id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);
  }, [comments]);

  // Mutations
  const addToContentQueue = useMutation({
    mutationFn: async (input: { title: string; description?: string }) => {
      const { data, error } = await supabase
        .from("video_queue" as any)
        .insert({
          workspace_id: workspaceId,
          title: input.title,
          description: input.description ?? "",
          status: "idea",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-queue"] }),
  });

  const addToContacts = useMutation({
    mutationFn: async (input: { name: string; avatar_url?: string }) => {
      const { data, error } = await supabase
        .from("contacts" as any)
        .insert({
          workspace_id: workspaceId,
          name: input.name,
          avatar_url: input.avatar_url ?? null,
          source: "youtube_comment",
          status: "active",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });

  const markReplied = useMutation({
    mutationFn: async (input: { commentId: string; reply?: string }) => {
      const { data, error } = await supabase
        .from("youtube_comments" as any)
        .update({ our_reply: input.reply ?? "replied" })
        .eq("id", input.commentId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["youtube-comments-intel"] }),
  });

  return {
    comments,
    replyQueue,
    topicIdeas,
    topFans,
    sentimentDistribution,
    videoSentiments,
    isLoading: commentsQuery.isLoading,
    addToContentQueue,
    addToContacts,
    markReplied,
  };
}
