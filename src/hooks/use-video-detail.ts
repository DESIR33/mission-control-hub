import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { VideoAnalytics } from "@/hooks/use-youtube-analytics-api";

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

      // Fetch ALL Analytics API rows for this video to aggregate
      const { data: analyticsData } = await supabase
        .from("youtube_video_analytics" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("youtube_video_id", youtubeVideoId)
        .order("date", { ascending: false })
        .limit(5000);

      const analyticsRows = (analyticsData ?? []) as unknown as VideoAnalytics[];
      const hasAnalytics = analyticsRows.length > 0;

      // Also get Data API stats (cumulative snapshot)
      const { data: statsData } = await supabase
        .from("youtube_video_stats")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("youtube_video_id", youtubeVideoId)
        .order("fetched_at", { ascending: false })
        .limit(1);

      const stats = statsData?.[0];

      if (!hasAnalytics && !stats) return null;

      // Aggregate analytics rows (sum counters, weighted-avg for rates)
      const agg = analyticsRows.reduce(
        (acc, row) => {
          acc.views += row.views ?? 0;
          acc.likes += row.likes ?? 0;
          acc.comments += row.comments ?? 0;
          acc.estimated_minutes_watched += row.estimated_minutes_watched ?? 0;
          acc.impressions += row.impressions ?? 0;
          acc.subscribers_gained += row.subscribers_gained ?? 0;
          acc.subscribers_lost += row.subscribers_lost ?? 0;
          acc.dislikes += row.dislikes ?? 0;
          acc.shares += row.shares ?? 0;
          acc.card_clicks += row.card_clicks ?? 0;
          acc.card_impressions += row.card_impressions ?? 0;
          acc.end_screen_element_clicks += row.end_screen_element_clicks ?? 0;
          acc.end_screen_element_impressions += row.end_screen_element_impressions ?? 0;
          acc.estimated_revenue += Number(row.estimated_revenue ?? 0);
          // For weighted averages, accumulate weighted sums
          acc.avg_duration_weighted += (row.average_view_duration_seconds ?? 0) * (row.views ?? 0);
          acc.avg_pct_weighted += Number(row.average_view_percentage ?? 0) * (row.views ?? 0);
          return acc;
        },
        {
          views: 0, likes: 0, comments: 0, estimated_minutes_watched: 0,
          impressions: 0, subscribers_gained: 0, subscribers_lost: 0,
          dislikes: 0, shares: 0, card_clicks: 0, card_impressions: 0,
          end_screen_element_clicks: 0, end_screen_element_impressions: 0,
          estimated_revenue: 0, avg_duration_weighted: 0, avg_pct_weighted: 0,
        }
      );

      const totalViews = hasAnalytics ? agg.views : (stats?.views ?? 0);
      const avgDuration = totalViews > 0 ? agg.avg_duration_weighted / totalViews : 0;
      const avgPct = totalViews > 0 ? agg.avg_pct_weighted / totalViews : 0;
      // CTR = impressions_ctr is a ratio (0-1); compute from aggregated impressions
      const aggCtr = agg.impressions > 0 ? (agg.views / agg.impressions) : 0;
      const latestTitle = analyticsRows[0]?.title;

      return {
        youtube_video_id: youtubeVideoId,
        title: latestTitle || stats?.title || youtubeVideoId,
        views: hasAnalytics ? Math.max(agg.views, stats?.views ?? 0) : (stats?.views ?? 0),
        likes: hasAnalytics ? Math.max(agg.likes, stats?.likes ?? 0) : (stats?.likes ?? 0),
        comments: hasAnalytics ? Math.max(agg.comments, stats?.comments ?? 0) : (stats?.comments ?? 0),
        watch_time_minutes: hasAnalytics ? agg.estimated_minutes_watched : (stats?.watch_time_minutes ?? 0),
        ctr_percent: hasAnalytics && aggCtr > 0 ? aggCtr * 100 : Number(stats?.ctr_percent ?? 0),
        published_at: stats?.published_at ?? null,
        impressions: agg.impressions,
        average_view_duration_seconds: avgDuration,
        average_view_percentage: avgPct,
        subscribers_gained: agg.subscribers_gained,
        subscribers_lost: agg.subscribers_lost,
        dislikes: agg.dislikes,
        shares: agg.shares,
        card_clicks: agg.card_clicks,
        card_impressions: agg.card_impressions,
        end_screen_element_clicks: agg.end_screen_element_clicks,
        end_screen_element_impressions: agg.end_screen_element_impressions,
        estimated_revenue: agg.estimated_revenue,
        hasAnalyticsData: hasAnalytics,
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
