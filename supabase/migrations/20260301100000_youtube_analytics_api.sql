-- ============================================
-- YOUTUBE ANALYTICS API TABLES
-- Extended analytics from the YouTube Analytics API
-- Provides demographics, traffic sources, geography,
-- device data, revenue, and detailed channel/video metrics
-- ============================================

-- Daily channel-level analytics from YouTube Analytics API
CREATE TABLE public.youtube_channel_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views BIGINT NOT NULL DEFAULT 0,
  estimated_minutes_watched BIGINT NOT NULL DEFAULT 0,
  average_view_duration_seconds INTEGER NOT NULL DEFAULT 0,
  average_view_percentage NUMERIC(5,2) DEFAULT 0,
  subscribers_gained INTEGER NOT NULL DEFAULT 0,
  subscribers_lost INTEGER NOT NULL DEFAULT 0,
  net_subscribers INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  dislikes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  impressions_ctr NUMERIC(5,2) DEFAULT 0,
  unique_viewers BIGINT NOT NULL DEFAULT 0,
  annotation_click_through_rate NUMERIC(5,2) DEFAULT 0,
  card_clicks INTEGER NOT NULL DEFAULT 0,
  card_impressions INTEGER NOT NULL DEFAULT 0,
  card_ctr NUMERIC(5,2) DEFAULT 0,
  end_screen_element_clicks INTEGER NOT NULL DEFAULT 0,
  end_screen_element_impressions INTEGER NOT NULL DEFAULT 0,
  end_screen_element_ctr NUMERIC(5,2) DEFAULT 0,
  estimated_revenue NUMERIC(10,2) DEFAULT 0,
  estimated_ad_revenue NUMERIC(10,2) DEFAULT 0,
  estimated_red_partner_revenue NUMERIC(10,2) DEFAULT 0,
  gross_revenue NUMERIC(10,2) DEFAULT 0,
  cpm NUMERIC(8,2) DEFAULT 0,
  ad_impressions BIGINT NOT NULL DEFAULT 0,
  monetized_playbacks BIGINT NOT NULL DEFAULT 0,
  playback_based_cpm NUMERIC(8,2) DEFAULT 0,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, date)
);

CREATE INDEX idx_yt_channel_analytics_ws_date ON public.youtube_channel_analytics(workspace_id, date DESC);

ALTER TABLE public.youtube_channel_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view youtube_channel_analytics"
  ON public.youtube_channel_analytics FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Service can insert youtube_channel_analytics"
  ON public.youtube_channel_analytics FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin', 'operator', 'contributor'));

CREATE POLICY "Service can update youtube_channel_analytics"
  ON public.youtube_channel_analytics FOR UPDATE
  USING (public.get_workspace_role(workspace_id) IN ('admin', 'operator', 'contributor'));

-- Per-video detailed analytics from YouTube Analytics API
CREATE TABLE public.youtube_video_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL,
  views BIGINT NOT NULL DEFAULT 0,
  estimated_minutes_watched BIGINT NOT NULL DEFAULT 0,
  average_view_duration_seconds INTEGER NOT NULL DEFAULT 0,
  average_view_percentage NUMERIC(5,2) DEFAULT 0,
  subscribers_gained INTEGER NOT NULL DEFAULT 0,
  subscribers_lost INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  dislikes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  impressions_ctr NUMERIC(5,2) DEFAULT 0,
  card_clicks INTEGER NOT NULL DEFAULT 0,
  card_impressions INTEGER NOT NULL DEFAULT 0,
  end_screen_element_clicks INTEGER NOT NULL DEFAULT 0,
  end_screen_element_impressions INTEGER NOT NULL DEFAULT 0,
  annotation_click_through_rate NUMERIC(5,2) DEFAULT 0,
  estimated_revenue NUMERIC(10,2) DEFAULT 0,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, youtube_video_id, date)
);

CREATE INDEX idx_yt_video_analytics_ws ON public.youtube_video_analytics(workspace_id, date DESC);
CREATE INDEX idx_yt_video_analytics_video ON public.youtube_video_analytics(workspace_id, youtube_video_id, date DESC);

ALTER TABLE public.youtube_video_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view youtube_video_analytics"
  ON public.youtube_video_analytics FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Service can insert youtube_video_analytics"
  ON public.youtube_video_analytics FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin', 'operator', 'contributor'));

CREATE POLICY "Service can update youtube_video_analytics"
  ON public.youtube_video_analytics FOR UPDATE
  USING (public.get_workspace_role(workspace_id) IN ('admin', 'operator', 'contributor'));

-- Audience demographics (age group + gender breakdown)
CREATE TABLE public.youtube_demographics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  age_group TEXT NOT NULL,
  gender TEXT NOT NULL,
  viewer_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, date, age_group, gender)
);

CREATE INDEX idx_yt_demographics_ws ON public.youtube_demographics(workspace_id, date DESC);

ALTER TABLE public.youtube_demographics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view youtube_demographics"
  ON public.youtube_demographics FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Service can insert youtube_demographics"
  ON public.youtube_demographics FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin', 'operator', 'contributor'));

-- Traffic source breakdown
CREATE TABLE public.youtube_traffic_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  source_type TEXT NOT NULL,
  views BIGINT NOT NULL DEFAULT 0,
  estimated_minutes_watched BIGINT NOT NULL DEFAULT 0,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, date, source_type)
);

CREATE INDEX idx_yt_traffic_sources_ws ON public.youtube_traffic_sources(workspace_id, date DESC);

ALTER TABLE public.youtube_traffic_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view youtube_traffic_sources"
  ON public.youtube_traffic_sources FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Service can insert youtube_traffic_sources"
  ON public.youtube_traffic_sources FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin', 'operator', 'contributor'));

-- Geographic viewer data (country-level)
CREATE TABLE public.youtube_geography (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  country TEXT NOT NULL,
  views BIGINT NOT NULL DEFAULT 0,
  estimated_minutes_watched BIGINT NOT NULL DEFAULT 0,
  average_view_duration_seconds INTEGER NOT NULL DEFAULT 0,
  subscribers_gained INTEGER NOT NULL DEFAULT 0,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, date, country)
);

CREATE INDEX idx_yt_geography_ws ON public.youtube_geography(workspace_id, date DESC);

ALTER TABLE public.youtube_geography ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view youtube_geography"
  ON public.youtube_geography FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Service can insert youtube_geography"
  ON public.youtube_geography FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin', 'operator', 'contributor'));

-- Device type breakdown
CREATE TABLE public.youtube_device_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  device_type TEXT NOT NULL,
  views BIGINT NOT NULL DEFAULT 0,
  estimated_minutes_watched BIGINT NOT NULL DEFAULT 0,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, date, device_type)
);

CREATE INDEX idx_yt_device_types_ws ON public.youtube_device_types(workspace_id, date DESC);

ALTER TABLE public.youtube_device_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view youtube_device_types"
  ON public.youtube_device_types FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Service can insert youtube_device_types"
  ON public.youtube_device_types FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin', 'operator', 'contributor'));

-- Add upsert-friendly policy for service role updates
ALTER TABLE public.youtube_video_stats ADD COLUMN IF NOT EXISTS avg_view_duration_seconds INTEGER;
ALTER TABLE public.youtube_video_stats ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Allow update on youtube_video_stats for upserts
CREATE POLICY "Operators+ can update youtube_video_stats"
  ON public.youtube_video_stats FOR UPDATE
  USING (public.get_workspace_role(workspace_id) IN ('admin', 'operator', 'contributor'));
