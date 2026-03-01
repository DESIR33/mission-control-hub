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

      // Try Analytics API data first (richer)
      const { data: analyticsData } = await supabase
        .from("youtube_video_analytics" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("youtube_video_id", youtubeVideoId)
        .order("date", { ascending: false })
        .limit(1);

      const analytics = (analyticsData as any)?.[0] as VideoAnalytics | undefined;

      // Also get Data API stats
      const { data: statsData } = await supabase
        .from("youtube_video_stats")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("youtube_video_id", youtubeVideoId)
        .order("fetched_at", { ascending: false })
        .limit(1);

      const stats = statsData?.[0];

      if (!analytics && !stats) return null;

      // YouTube Analytics API returns impressionsCtr as a ratio (0-1); convert to percentage
      const rawCtr = Number(analytics?.impressions_ctr ?? 0);

      return {
        youtube_video_id: youtubeVideoId,
        title: analytics?.title || stats?.title || youtubeVideoId,
        views: analytics?.views ?? stats?.views ?? 0,
        likes: analytics?.likes ?? stats?.likes ?? 0,
        comments: analytics?.comments ?? stats?.comments ?? 0,
        watch_time_minutes: analytics?.estimated_minutes_watched ?? stats?.watch_time_minutes ?? 0,
        ctr_percent: rawCtr * 100 || Number(stats?.ctr_percent ?? 0),
        published_at: stats?.published_at ?? null,
        impressions: analytics?.impressions ?? 0,
        average_view_duration_seconds: analytics?.average_view_duration_seconds ?? stats?.avg_view_duration_seconds ?? 0,
        average_view_percentage: Number(analytics?.average_view_percentage ?? 0),
        subscribers_gained: analytics?.subscribers_gained ?? 0,
        subscribers_lost: analytics?.subscribers_lost ?? 0,
        dislikes: analytics?.dislikes ?? 0,
        shares: analytics?.shares ?? 0,
        card_clicks: analytics?.card_clicks ?? 0,
        card_impressions: analytics?.card_impressions ?? 0,
        end_screen_element_clicks: analytics?.end_screen_element_clicks ?? 0,
        end_screen_element_impressions: analytics?.end_screen_element_impressions ?? 0,
        estimated_revenue: Number(analytics?.estimated_revenue ?? 0),
        hasAnalyticsData: !!analytics,
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
