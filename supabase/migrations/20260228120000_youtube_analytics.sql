-- ============================================
-- YOUTUBE ANALYTICS TABLES
-- Cache YouTube channel and video metrics
-- ============================================

-- Channel-level stats (subscriber count, total views, etc.)
CREATE TABLE public.youtube_channel_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subscriber_count BIGINT NOT NULL DEFAULT 0,
  video_count INTEGER NOT NULL DEFAULT 0,
  total_view_count BIGINT NOT NULL DEFAULT 0,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_yt_channel_stats_workspace ON public.youtube_channel_stats(workspace_id);
CREATE INDEX idx_yt_channel_stats_fetched ON public.youtube_channel_stats(workspace_id, fetched_at DESC);

ALTER TABLE public.youtube_channel_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view youtube_channel_stats"
  ON public.youtube_channel_stats FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert youtube_channel_stats"
  ON public.youtube_channel_stats FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin', 'operator', 'contributor'));

CREATE POLICY "Admins can delete youtube_channel_stats"
  ON public.youtube_channel_stats FOR DELETE
  USING (public.get_workspace_role(workspace_id) = 'admin');

-- Per-video stats
CREATE TABLE public.youtube_video_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  views BIGINT NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  watch_time_minutes BIGINT NOT NULL DEFAULT 0,
  ctr_percent NUMERIC(5,2),
  avg_view_duration_seconds INTEGER,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_yt_video_stats_workspace ON public.youtube_video_stats(workspace_id);
CREATE INDEX idx_yt_video_stats_video ON public.youtube_video_stats(workspace_id, youtube_video_id);

ALTER TABLE public.youtube_video_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view youtube_video_stats"
  ON public.youtube_video_stats FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert youtube_video_stats"
  ON public.youtube_video_stats FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin', 'operator', 'contributor'));

CREATE POLICY "Admins can delete youtube_video_stats"
  ON public.youtube_video_stats FOR DELETE
  USING (public.get_workspace_role(workspace_id) = 'admin');

-- Growth goals (subscriber targets, revenue targets, etc.)
CREATE TABLE public.growth_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  metric TEXT NOT NULL DEFAULT 'subscribers',
  target_value NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  start_date DATE,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_growth_goals_workspace ON public.growth_goals(workspace_id);

CREATE TRIGGER trg_growth_goals_updated
  BEFORE UPDATE ON public.growth_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.growth_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view growth_goals"
  ON public.growth_goals FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert growth_goals"
  ON public.growth_goals FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin', 'operator', 'contributor'));

CREATE POLICY "Operators+ can update growth_goals"
  ON public.growth_goals FOR UPDATE
  USING (public.get_workspace_role(workspace_id) IN ('admin', 'operator', 'contributor'));

CREATE POLICY "Admins can delete growth_goals"
  ON public.growth_goals FOR DELETE
  USING (public.get_workspace_role(workspace_id) = 'admin');
