import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";


export interface VideoDetailStats {
  youtube_video_id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  watch_time_minutes: number;
  ctr_percent: number;
  published_at: string | null;
  // Analytics API fields (optional)
  impressions: number;
  average_view_duration_seconds: number;
  average_view_percentage: number;
  subscribers_gained: number;
  subscribers_lost: number;
  dislikes: number;
  shares: number;
  card_clicks: number;
  card_impressions: number;
  end_screen_element_clicks: number;
  end_screen_element_impressions: number;
  estimated_revenue: number;
  hasAnalyticsData: boolean;
}

export function useVideoDetail(youtubeVideoId: string | undefined) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["video-detail", workspaceId, youtubeVideoId],
    queryFn: async (): Promise<VideoDetailStats | null> => {
      if (!workspaceId || !youtubeVideoId) return null;

      // Server-side aggregation via RPC (replaces 5000-row client fetch)
      const [aggResult, statsResult] = await Promise.all([
        supabase.rpc("aggregate_video_analytics" as any, {
          p_workspace_id: workspaceId,
          p_video_id: youtubeVideoId,
        }),
        supabase
          .from("youtube_video_stats")
          .select("title, views, likes, comments, watch_time_minutes, ctr_percent, published_at")
          .eq("workspace_id", workspaceId)
          .eq("youtube_video_id", youtubeVideoId)
          .order("fetched_at", { ascending: false })
          .limit(1),
      ]);

      const agg = (aggResult.data as any)?.[0] ?? null;
      const stats = statsResult.data?.[0];
      const hasAnalytics = agg && Number(agg.row_count) > 0;

      if (!hasAnalytics && !stats) return null;

      const totalViews = hasAnalytics ? Number(agg.total_views) : 0;
      const aggCtr = hasAnalytics && Number(agg.total_impressions) > 0
        ? Number(agg.total_views) / Number(agg.total_impressions)
        : 0;

      return {
        youtube_video_id: youtubeVideoId,
        title: (hasAnalytics ? agg.latest_title : null) || stats?.title || youtubeVideoId,
        views: hasAnalytics ? Math.max(Number(agg.total_views), stats?.views ?? 0) : (stats?.views ?? 0),
        likes: hasAnalytics ? Math.max(Number(agg.total_likes), stats?.likes ?? 0) : (stats?.likes ?? 0),
        comments: hasAnalytics ? Math.max(Number(agg.total_comments), stats?.comments ?? 0) : (stats?.comments ?? 0),
        watch_time_minutes: hasAnalytics ? Number(agg.total_estimated_minutes_watched) : (stats?.watch_time_minutes ?? 0),
        ctr_percent: hasAnalytics && aggCtr > 0 ? aggCtr * 100 : Number(stats?.ctr_percent ?? 0),
        published_at: stats?.published_at ?? null,
        impressions: hasAnalytics ? Number(agg.total_impressions) : 0,
        average_view_duration_seconds: hasAnalytics ? Number(agg.weighted_avg_view_duration) : 0,
        average_view_percentage: hasAnalytics ? Number(agg.weighted_avg_view_percentage) : 0,
        subscribers_gained: hasAnalytics ? Number(agg.total_subscribers_gained) : 0,
        subscribers_lost: hasAnalytics ? Number(agg.total_subscribers_lost) : 0,
        dislikes: hasAnalytics ? Number(agg.total_dislikes) : 0,
        shares: hasAnalytics ? Number(agg.total_shares) : 0,
        card_clicks: hasAnalytics ? Number(agg.total_card_clicks) : 0,
        card_impressions: hasAnalytics ? Number(agg.total_card_impressions) : 0,
        end_screen_element_clicks: hasAnalytics ? Number(agg.total_end_screen_element_clicks) : 0,
        end_screen_element_impressions: hasAnalytics ? Number(agg.total_end_screen_element_impressions) : 0,
        estimated_revenue: hasAnalytics ? Number(agg.total_estimated_revenue) : 0,
        hasAnalyticsData: !!hasAnalytics,
      };
    },
    enabled: !!workspaceId && !!youtubeVideoId,
  });
}

export function useVideoAnalyticsTrend(youtubeVideoId: string | undefined, limit = 30) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["video-analytics-trend", workspaceId, youtubeVideoId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_video_analytics" as any)
        .select("date, views, likes, comments, impressions, impressions_ctr, estimated_revenue")
        .eq("workspace_id", workspaceId!)
        .eq("youtube_video_id", youtubeVideoId!)
        .order("date", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId && !!youtubeVideoId,
  });
}
