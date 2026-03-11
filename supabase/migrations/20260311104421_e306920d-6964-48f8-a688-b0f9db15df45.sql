
CREATE OR REPLACE FUNCTION public.aggregate_video_analytics(
  p_workspace_id uuid,
  p_video_id text
)
RETURNS TABLE(
  total_views bigint,
  total_likes bigint,
  total_comments bigint,
  total_estimated_minutes_watched double precision,
  total_impressions bigint,
  total_subscribers_gained bigint,
  total_subscribers_lost bigint,
  total_dislikes bigint,
  total_shares bigint,
  total_card_clicks bigint,
  total_card_impressions bigint,
  total_end_screen_element_clicks bigint,
  total_end_screen_element_impressions bigint,
  total_estimated_revenue double precision,
  weighted_avg_view_duration double precision,
  weighted_avg_view_percentage double precision,
  latest_title text,
  row_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    COALESCE(SUM(views), 0)::bigint AS total_views,
    COALESCE(SUM(likes), 0)::bigint AS total_likes,
    COALESCE(SUM(comments), 0)::bigint AS total_comments,
    COALESCE(SUM(estimated_minutes_watched), 0)::double precision AS total_estimated_minutes_watched,
    COALESCE(SUM(impressions), 0)::bigint AS total_impressions,
    COALESCE(SUM(subscribers_gained), 0)::bigint AS total_subscribers_gained,
    COALESCE(SUM(subscribers_lost), 0)::bigint AS total_subscribers_lost,
    COALESCE(SUM(dislikes), 0)::bigint AS total_dislikes,
    COALESCE(SUM(shares), 0)::bigint AS total_shares,
    COALESCE(SUM(card_clicks), 0)::bigint AS total_card_clicks,
    COALESCE(SUM(card_impressions), 0)::bigint AS total_card_impressions,
    COALESCE(SUM(end_screen_element_clicks), 0)::bigint AS total_end_screen_element_clicks,
    COALESCE(SUM(end_screen_element_impressions), 0)::bigint AS total_end_screen_element_impressions,
    COALESCE(SUM(estimated_revenue::double precision), 0)::double precision AS total_estimated_revenue,
    CASE WHEN COALESCE(SUM(views), 0) > 0
      THEN SUM(average_view_duration_seconds * views)::double precision / SUM(views)::double precision
      ELSE 0
    END AS weighted_avg_view_duration,
    CASE WHEN COALESCE(SUM(views), 0) > 0
      THEN SUM(average_view_percentage::double precision * views)::double precision / SUM(views)::double precision
      ELSE 0
    END AS weighted_avg_view_percentage,
    (SELECT yva.title FROM youtube_video_analytics yva
     WHERE yva.workspace_id = p_workspace_id AND yva.youtube_video_id = p_video_id
     ORDER BY yva.date DESC LIMIT 1
    ) AS latest_title,
    COUNT(*)::bigint AS row_count
  FROM youtube_video_analytics
  WHERE workspace_id = p_workspace_id
    AND youtube_video_id = p_video_id;
$$;
