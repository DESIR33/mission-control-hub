
-- 1. youtube_channel_analytics (daily channel metrics from Analytics API)
CREATE TABLE public.youtube_channel_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  date date NOT NULL,
  views integer NOT NULL DEFAULT 0,
  estimated_minutes_watched integer NOT NULL DEFAULT 0,
  average_view_duration_seconds integer NOT NULL DEFAULT 0,
  average_view_percentage numeric NOT NULL DEFAULT 0,
  subscribers_gained integer NOT NULL DEFAULT 0,
  subscribers_lost integer NOT NULL DEFAULT 0,
  net_subscribers integer NOT NULL DEFAULT 0,
  likes integer NOT NULL DEFAULT 0,
  dislikes integer NOT NULL DEFAULT 0,
  comments integer NOT NULL DEFAULT 0,
  shares integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  impressions_ctr numeric NOT NULL DEFAULT 0,
  unique_viewers integer NOT NULL DEFAULT 0,
  card_clicks integer NOT NULL DEFAULT 0,
  card_impressions integer NOT NULL DEFAULT 0,
  card_ctr numeric NOT NULL DEFAULT 0,
  end_screen_element_clicks integer NOT NULL DEFAULT 0,
  end_screen_element_impressions integer NOT NULL DEFAULT 0,
  end_screen_element_ctr numeric NOT NULL DEFAULT 0,
  estimated_revenue numeric NOT NULL DEFAULT 0,
  estimated_ad_revenue numeric NOT NULL DEFAULT 0,
  estimated_red_partner_revenue numeric NOT NULL DEFAULT 0,
  gross_revenue numeric NOT NULL DEFAULT 0,
  cpm numeric NOT NULL DEFAULT 0,
  ad_impressions integer NOT NULL DEFAULT 0,
  monetized_playbacks integer NOT NULL DEFAULT 0,
  playback_based_cpm numeric NOT NULL DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, date)
);

ALTER TABLE public.youtube_channel_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view youtube_channel_analytics" ON public.youtube_channel_analytics FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Service can insert youtube_channel_analytics" ON public.youtube_channel_analytics FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Service can update youtube_channel_analytics" ON public.youtube_channel_analytics FOR UPDATE USING (is_workspace_member(workspace_id));

-- 2. youtube_video_analytics (per-video metrics from Analytics API)
CREATE TABLE public.youtube_video_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  youtube_video_id text NOT NULL,
  title text NOT NULL DEFAULT 'Untitled',
  date date NOT NULL,
  views integer NOT NULL DEFAULT 0,
  estimated_minutes_watched integer NOT NULL DEFAULT 0,
  average_view_duration_seconds integer NOT NULL DEFAULT 0,
  average_view_percentage numeric NOT NULL DEFAULT 0,
  subscribers_gained integer NOT NULL DEFAULT 0,
  subscribers_lost integer NOT NULL DEFAULT 0,
  likes integer NOT NULL DEFAULT 0,
  dislikes integer NOT NULL DEFAULT 0,
  comments integer NOT NULL DEFAULT 0,
  shares integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  impressions_ctr numeric NOT NULL DEFAULT 0,
  card_clicks integer NOT NULL DEFAULT 0,
  card_impressions integer NOT NULL DEFAULT 0,
  end_screen_element_clicks integer NOT NULL DEFAULT 0,
  end_screen_element_impressions integer NOT NULL DEFAULT 0,
  annotation_click_through_rate numeric NOT NULL DEFAULT 0,
  estimated_revenue numeric NOT NULL DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, youtube_video_id, date)
);

ALTER TABLE public.youtube_video_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view youtube_video_analytics" ON public.youtube_video_analytics FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Service can insert youtube_video_analytics" ON public.youtube_video_analytics FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Service can update youtube_video_analytics" ON public.youtube_video_analytics FOR UPDATE USING (is_workspace_member(workspace_id));

-- 3. youtube_demographics
CREATE TABLE public.youtube_demographics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  date date NOT NULL,
  age_group text NOT NULL,
  gender text NOT NULL,
  viewer_percentage numeric NOT NULL DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, date, age_group, gender)
);

ALTER TABLE public.youtube_demographics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view youtube_demographics" ON public.youtube_demographics FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Service can insert youtube_demographics" ON public.youtube_demographics FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Service can update youtube_demographics" ON public.youtube_demographics FOR UPDATE USING (is_workspace_member(workspace_id));

-- 4. youtube_traffic_sources
CREATE TABLE public.youtube_traffic_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  date date NOT NULL,
  source_type text NOT NULL,
  views integer NOT NULL DEFAULT 0,
  estimated_minutes_watched integer NOT NULL DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, date, source_type)
);

ALTER TABLE public.youtube_traffic_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view youtube_traffic_sources" ON public.youtube_traffic_sources FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Service can insert youtube_traffic_sources" ON public.youtube_traffic_sources FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Service can update youtube_traffic_sources" ON public.youtube_traffic_sources FOR UPDATE USING (is_workspace_member(workspace_id));

-- 5. youtube_geography
CREATE TABLE public.youtube_geography (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  date date NOT NULL,
  country text NOT NULL,
  views integer NOT NULL DEFAULT 0,
  estimated_minutes_watched integer NOT NULL DEFAULT 0,
  average_view_duration_seconds integer NOT NULL DEFAULT 0,
  subscribers_gained integer NOT NULL DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, date, country)
);

ALTER TABLE public.youtube_geography ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view youtube_geography" ON public.youtube_geography FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Service can insert youtube_geography" ON public.youtube_geography FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Service can update youtube_geography" ON public.youtube_geography FOR UPDATE USING (is_workspace_member(workspace_id));

-- 6. youtube_device_types
CREATE TABLE public.youtube_device_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  date date NOT NULL,
  device_type text NOT NULL,
  views integer NOT NULL DEFAULT 0,
  estimated_minutes_watched integer NOT NULL DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, date, device_type)
);

ALTER TABLE public.youtube_device_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view youtube_device_types" ON public.youtube_device_types FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Service can insert youtube_device_types" ON public.youtube_device_types FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Service can update youtube_device_types" ON public.youtube_device_types FOR UPDATE USING (is_workspace_member(workspace_id));
