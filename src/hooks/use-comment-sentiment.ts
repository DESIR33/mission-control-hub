import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface CommentSentiment {
  id: string;
  workspace_id: string;
  youtube_video_id: string;
  video_title: string | null;
  analyzed_at: string;
  total_comments: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  avg_sentiment: number | null;
  top_positive: { text: string; likes: number; sentiment_score: number }[] | null;
  top_negative: { text: string; likes: number; sentiment_score: number }[] | null;
  top_questions: { text: string; likes: number }[] | null;
  keyword_cloud: { word: string; count: number }[] | null;
  created_at: string;
}

export interface SentimentOverview {
  totalAnalyzed: number;
  avgSentiment: number;
  overallPositivePercent: number;
  overallNeutralPercent: number;
  overallNegativePercent: number;
  videoSentiments: CommentSentiment[];
  mostPositive: CommentSentiment | null;
  mostNegative: CommentSentiment | null;
  commonKeywords: { word: string; count: number }[];
  topQuestions: { text: string; likes: number; videoTitle: string }[];
}

export function useCommentSentiments() {
  const { workspaceId } = useWorkspace();

  const query = useQuery({
    queryKey: ["comment-sentiments", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comment_sentiments" as any)
        .select("id,workspace_id,youtube_video_id,video_title,analyzed_at,total_comments,positive_count,neutral_count,negative_count,avg_sentiment,top_positive,top_negative,top_questions,keyword_cloud,created_at")
        .eq("workspace_id", workspaceId!)
        .order("analyzed_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as CommentSentiment[];
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
  });

  return query;
}

export function useSentimentOverview() {
  const { data: sentiments = [], isLoading } = useCommentSentiments();

  const overview: SentimentOverview | null = sentiments.length > 0
    ? (() => {
        const totalComments = sentiments.reduce((s, v) => s + v.total_comments, 0);
        const totalPositive = sentiments.reduce((s, v) => s + v.positive_count, 0);
        const totalNeutral = sentiments.reduce((s, v) => s + v.neutral_count, 0);
        const totalNegative = sentiments.reduce((s, v) => s + v.negative_count, 0);
        const avgSentiment = sentiments.reduce((s, v) => s + (v.avg_sentiment ?? 0), 0) / sentiments.length;

        const sorted = [...sentiments].sort(
          (a, b) => (b.avg_sentiment ?? 0) - (a.avg_sentiment ?? 0)
        );

        // Aggregate keywords
        const kwMap = new Map<string, number>();
        sentiments.forEach((s) => {
          (s.keyword_cloud ?? []).forEach((kw) => {
            kwMap.set(kw.word, (kwMap.get(kw.word) ?? 0) + kw.count);
          });
        });
        const commonKeywords = Array.from(kwMap.entries())
          .map(([word, count]) => ({ word, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20);

        // Top questions across all videos
        const topQuestions = sentiments
          .flatMap((s) =>
            (s.top_questions ?? []).map((q) => ({
              ...q,
              videoTitle: s.video_title ?? "Untitled Video",
            }))
          )
          .sort((a, b) => b.likes - a.likes)
          .slice(0, 10);

        return {
          totalAnalyzed: sentiments.length,
          avgSentiment,
          overallPositivePercent: totalComments > 0 ? (totalPositive / totalComments) * 100 : 0,
          overallNeutralPercent: totalComments > 0 ? (totalNeutral / totalComments) * 100 : 0,
          overallNegativePercent: totalComments > 0 ? (totalNegative / totalComments) * 100 : 0,
          videoSentiments: sentiments,
          mostPositive: sorted[0] ?? null,
          mostNegative: sorted[sorted.length - 1] ?? null,
          commonKeywords,
          topQuestions,
        };
      })()
    : null;

  return { data: overview, isLoading };
}

export function useCreateCommentSentiment() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sentiment: Partial<CommentSentiment>) => {
      const { data, error } = await supabase
        .from("comment_sentiments" as any)
        .insert({ ...sentiment, workspace_id: workspaceId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comment-sentiments"] }),
  });
}
