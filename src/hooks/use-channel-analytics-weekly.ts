import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { getFreshness } from "@/config/data-freshness";

/**
 * Optimization #5: Server-side weekly aggregation for channel analytics.
 * Returns ~26 rows instead of ~180 daily rows, reducing transfer by ~85%.
 */
export interface WeeklyChannelAnalytics {
  week_start: string;
  total_views: number;
  total_estimated_minutes_watched: number;
  avg_view_duration: number;
  avg_view_percentage: number;
  total_subscribers_gained: number;
  total_subscribers_lost: number;
  total_net_subscribers: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_impressions: number;
  avg_impressions_ctr: number;
  total_estimated_revenue: number;
  total_estimated_ad_revenue: number;
  avg_cpm: number;
  total_ad_impressions: number;
  total_monetized_playbacks: number;
  avg_playback_based_cpm: number;
  total_card_clicks: number;
  total_card_impressions: number;
  day_count: number;
}

export function useChannelAnalyticsWeekly(days = 180) {
  const { workspaceId } = useWorkspace();

  return useQuery<WeeklyChannelAnalytics[]>({
    queryKey: ["youtube-channel-analytics-weekly", workspaceId, days],
    queryFn: async () => {
      if (!workspaceId) return [];

      try {
        const { data, error } = await supabase.rpc(
          "aggregate_channel_analytics_weekly" as any,
          { p_workspace_id: workspaceId, p_days: days }
        );

        if (error) throw error;
        return (data ?? []) as unknown as WeeklyChannelAnalytics[];
      } catch {
        return [];
      }
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
  });
}
