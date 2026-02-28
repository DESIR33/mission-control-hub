-- ============================================
-- YOUTUBE ANALYTICS TABLES
-- Stores YouTube channel and video statistics
-- ============================================

-- Channel-level stats (subscriber count, total views, etc.)
CREATE TABLE public.youtube_channel_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subscriber_count BIGINT NOT NULL DEFAULT 0,
  video_count BIGINT NOT NULL DEFAULT 0,
  view_count BIGINT NOT NULL DEFAULT 0,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_youtube_channel_stats_ws ON public.youtube_channel_stats(workspace_id);
CREATE INDEX idx_youtube_channel_stats_fetched ON public.youtube_channel_stats(workspace_id, fetched_at DESC);

-- RLS
ALTER TABLE public.youtube_channel_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view youtube channel stats"
  ON public.youtube_channel_stats FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Admins can insert youtube channel stats"
  ON public.youtube_channel_stats FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) = 'admin');

CREATE POLICY "Admins can delete youtube channel stats"
  ON public.youtube_channel_stats FOR DELETE
  USING (public.get_workspace_role(workspace_id) = 'admin');

-- Per-video stats
CREATE TABLE public.youtube_video_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  views BIGINT NOT NULL DEFAULT 0,
  likes BIGINT NOT NULL DEFAULT 0,
  comments BIGINT NOT NULL DEFAULT 0,
  watch_time_minutes NUMERIC NOT NULL DEFAULT 0,
  ctr_percent NUMERIC NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_youtube_video_stats_ws ON public.youtube_video_stats(workspace_id);
CREATE INDEX idx_youtube_video_stats_fetched ON public.youtube_video_stats(workspace_id, fetched_at DESC);

-- RLS
ALTER TABLE public.youtube_video_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view youtube video stats"
  ON public.youtube_video_stats FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Admins can insert youtube video stats"
  ON public.youtube_video_stats FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) = 'admin');

CREATE POLICY "Admins can delete youtube video stats"
  ON public.youtube_video_stats FOR DELETE
  USING (public.get_workspace_role(workspace_id) = 'admin');
