-- Optimization #5: Server-side aggregation RPC for channel analytics

CREATE OR REPLACE FUNCTION public.aggregate_channel_analytics_weekly(
  p_workspace_id uuid,
  p_days integer DEFAULT 180
)
RETURNS TABLE(
  week_start date,
  total_views bigint,
  total_estimated_minutes_watched double precision,
  avg_view_duration double precision,
  avg_view_percentage double precision,
  total_subscribers_gained bigint,
  total_subscribers_lost bigint,
  total_net_subscribers bigint,
  total_likes bigint,
  total_comments bigint,
  total_shares bigint,
  total_impressions bigint,
  avg_impressions_ctr double precision,
  total_estimated_revenue double precision,
  total_estimated_ad_revenue double precision,
  avg_cpm double precision,
  total_ad_impressions bigint,
  total_monetized_playbacks bigint,
  avg_playback_based_cpm double precision,
  total_card_clicks bigint,
  total_card_impressions bigint,
  day_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    date_trunc('week', date)::date AS week_start,
    COALESCE(SUM(views), 0)::bigint,
    COALESCE(SUM(estimated_minutes_watched), 0)::double precision,
    CASE WHEN SUM(views) > 0 
      THEN SUM(average_view_duration_seconds::double precision * views) / SUM(views)
      ELSE 0 END,
    CASE WHEN SUM(views) > 0
      THEN SUM(average_view_percentage::double precision * views) / SUM(views)
      ELSE 0 END,
    COALESCE(SUM(subscribers_gained), 0)::bigint,
    COALESCE(SUM(subscribers_lost), 0)::bigint,
    COALESCE(SUM(net_subscribers), 0)::bigint,
    COALESCE(SUM(likes), 0)::bigint,
    COALESCE(SUM(comments), 0)::bigint,
    COALESCE(SUM(shares), 0)::bigint,
    COALESCE(SUM(impressions), 0)::bigint,
    CASE WHEN SUM(impressions) > 0
      THEN SUM(impressions_ctr::double precision * impressions) / SUM(impressions)
      ELSE 0 END,
    COALESCE(SUM(estimated_revenue::double precision), 0),
    COALESCE(SUM(estimated_ad_revenue::double precision), 0),
    CASE WHEN SUM(views) > 0
      THEN SUM(cpm::double precision * views) / SUM(views)
      ELSE 0 END,
    COALESCE(SUM(ad_impressions), 0)::bigint,
    COALESCE(SUM(monetized_playbacks), 0)::bigint,
    CASE WHEN SUM(monetized_playbacks) > 0
      THEN SUM(playback_based_cpm::double precision * monetized_playbacks) / SUM(monetized_playbacks)
      ELSE 0 END,
    COALESCE(SUM(card_clicks), 0)::bigint,
    COALESCE(SUM(card_impressions), 0)::bigint,
    COUNT(*)::bigint
  FROM youtube_channel_analytics
  WHERE workspace_id = p_workspace_id
    AND date >= (CURRENT_DATE - p_days)
  GROUP BY date_trunc('week', date)
  ORDER BY week_start DESC;
$$;

-- Optimization #4: Consolidated polling counts RPC 
CREATE OR REPLACE FUNCTION public.get_dashboard_polling_counts(p_workspace_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'pending_proposals', (
      SELECT COUNT(*) FROM ai_proposals 
      WHERE workspace_id = p_workspace_id AND status = 'pending'
    ),
    'active_experiments', (
      SELECT COUNT(*) FROM video_optimization_experiments 
      WHERE workspace_id = p_workspace_id AND status = 'active'
    ),
    'unread_notifications', (
      SELECT COUNT(*) FROM strategist_notifications 
      WHERE workspace_id = p_workspace_id AND read = false
    ),
    'performance_alerts', (
      SELECT COUNT(*) FROM video_performance_alerts 
      WHERE workspace_id = p_workspace_id AND is_read = false
    )
  );
$$;