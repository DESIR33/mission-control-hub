
-- =====================================================
-- 1. YOUTUBE_CHANNEL_ANALYTICS → range-partitioned by date
-- =====================================================

-- Drop dependent indexes first
DROP INDEX IF EXISTS idx_yt_channel_analytics_date;
DROP INDEX IF EXISTS idx_yt_channel_analytics_ws_date;

-- Rename legacy
ALTER TABLE public.youtube_channel_analytics RENAME TO youtube_channel_analytics_legacy;

-- Drop RLS policies on legacy (they'll be recreated on new table)
DROP POLICY IF EXISTS "Members can view youtube_channel_analytics" ON public.youtube_channel_analytics_legacy;
DROP POLICY IF EXISTS "Service can insert youtube_channel_analytics" ON public.youtube_channel_analytics_legacy;
DROP POLICY IF EXISTS "Service can update youtube_channel_analytics" ON public.youtube_channel_analytics_legacy;

-- Create partitioned table (PK must include partition key)
CREATE TABLE public.youtube_channel_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
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
  PRIMARY KEY (id, date),
  UNIQUE (workspace_id, date)
) PARTITION BY RANGE (date);

-- Partitions: archive (<2026), hot (2026), future (2027+)
CREATE TABLE public.yt_chan_analytics_archive
  PARTITION OF public.youtube_channel_analytics
  FOR VALUES FROM (MINVALUE) TO ('2026-01-01');

CREATE TABLE public.yt_chan_analytics_2026
  PARTITION OF public.youtube_channel_analytics
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE public.yt_chan_analytics_2027
  PARTITION OF public.youtube_channel_analytics
  FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

CREATE TABLE public.yt_chan_analytics_default
  PARTITION OF public.youtube_channel_analytics DEFAULT;

-- Migrate data
INSERT INTO public.youtube_channel_analytics
  SELECT * FROM public.youtube_channel_analytics_legacy;

-- Drop legacy
DROP TABLE public.youtube_channel_analytics_legacy;

-- Recreate indexes
CREATE INDEX idx_yt_channel_analytics_ws_date
  ON public.youtube_channel_analytics (workspace_id, date DESC);

-- RLS
ALTER TABLE public.youtube_channel_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view youtube_channel_analytics"
  ON public.youtube_channel_analytics FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Service can insert youtube_channel_analytics"
  ON public.youtube_channel_analytics FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Service can update youtube_channel_analytics"
  ON public.youtube_channel_analytics FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- =====================================================
-- 2. YOUTUBE_SYNC_LOGS → range-partitioned by created_at
-- =====================================================

DROP INDEX IF EXISTS idx_yt_sync_logs_ws_type_completed;

ALTER TABLE public.youtube_sync_logs RENAME TO youtube_sync_logs_legacy;

DROP POLICY IF EXISTS "Members can view youtube_sync_logs" ON public.youtube_sync_logs_legacy;
DROP POLICY IF EXISTS "Members can insert youtube_sync_logs" ON public.youtube_sync_logs_legacy;
DROP POLICY IF EXISTS "Members can update youtube_sync_logs" ON public.youtube_sync_logs_legacy;

CREATE TABLE public.youtube_sync_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sync_type text NOT NULL,
  status text NOT NULL DEFAULT 'syncing',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  records_synced integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE public.yt_sync_logs_archive
  PARTITION OF public.youtube_sync_logs
  FOR VALUES FROM (MINVALUE) TO ('2026-01-01');

CREATE TABLE public.yt_sync_logs_2026
  PARTITION OF public.youtube_sync_logs
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE public.yt_sync_logs_2027
  PARTITION OF public.youtube_sync_logs
  FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

CREATE TABLE public.yt_sync_logs_default
  PARTITION OF public.youtube_sync_logs DEFAULT;

INSERT INTO public.youtube_sync_logs
  SELECT * FROM public.youtube_sync_logs_legacy;

DROP TABLE public.youtube_sync_logs_legacy;

CREATE INDEX idx_yt_sync_logs_ws_type_completed
  ON public.youtube_sync_logs (workspace_id, sync_type, completed_at DESC);

ALTER TABLE public.youtube_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view youtube_sync_logs"
  ON public.youtube_sync_logs FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can insert youtube_sync_logs"
  ON public.youtube_sync_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update youtube_sync_logs"
  ON public.youtube_sync_logs FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- =====================================================
-- 3. YOUTUBE_COMMENTS → range-partitioned by created_at
--    (using created_at instead of published_at to keep
--     unique constraint on workspace_id, youtube_comment_id)
-- =====================================================

DROP INDEX IF EXISTS idx_yt_comments_ws_published;
DROP INDEX IF EXISTS idx_yt_comments_ws_video;
DROP INDEX IF EXISTS idx_yt_comments_ws_comment_id;

ALTER TABLE public.youtube_comments RENAME TO youtube_comments_legacy;

DROP POLICY IF EXISTS "Members can view youtube_comments" ON public.youtube_comments_legacy;
DROP POLICY IF EXISTS "Members can insert youtube_comments" ON public.youtube_comments_legacy;
DROP POLICY IF EXISTS "Members can update youtube_comments" ON public.youtube_comments_legacy;

CREATE TABLE public.youtube_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  youtube_comment_id text NOT NULL,
  youtube_video_id text,
  video_id text,
  video_title text,
  comment_id text,
  author_name text,
  author_channel_id text,
  author_channel_url text,
  author_profile_url text,
  author_avatar text,
  author_avatar_url text,
  text text,
  text_display text,
  like_count integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  sentiment text,
  priority text DEFAULT 'normal',
  is_replied boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  is_hearted boolean DEFAULT false,
  our_reply text,
  suggested_reply text,
  status text DEFAULT 'new',
  published_at timestamptz,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at),
  UNIQUE (workspace_id, youtube_comment_id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE public.yt_comments_archive
  PARTITION OF public.youtube_comments
  FOR VALUES FROM (MINVALUE) TO ('2026-01-01');

CREATE TABLE public.yt_comments_2026
  PARTITION OF public.youtube_comments
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE public.yt_comments_2027
  PARTITION OF public.youtube_comments
  FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

CREATE TABLE public.yt_comments_default
  PARTITION OF public.youtube_comments DEFAULT;

INSERT INTO public.youtube_comments
  SELECT * FROM public.youtube_comments_legacy;

DROP TABLE public.youtube_comments_legacy;

CREATE INDEX idx_yt_comments_ws_published
  ON public.youtube_comments (workspace_id, published_at DESC);

CREATE INDEX idx_yt_comments_ws_video
  ON public.youtube_comments (workspace_id, youtube_video_id);

CREATE UNIQUE INDEX idx_yt_comments_ws_comment_id
  ON public.youtube_comments (workspace_id, comment_id, created_at)
  WHERE comment_id IS NOT NULL;

ALTER TABLE public.youtube_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view youtube_comments"
  ON public.youtube_comments FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can insert youtube_comments"
  ON public.youtube_comments FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update youtube_comments"
  ON public.youtube_comments FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id));
