
-- YouTube channel stats snapshots
CREATE TABLE public.youtube_channel_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  subscriber_count integer NOT NULL DEFAULT 0,
  video_count integer NOT NULL DEFAULT 0,
  total_view_count bigint NOT NULL DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.youtube_channel_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view youtube_channel_stats"
  ON public.youtube_channel_stats FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Service can insert youtube_channel_stats"
  ON public.youtube_channel_stats FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

-- YouTube video stats
CREATE TABLE public.youtube_video_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  youtube_video_id text NOT NULL,
  title text NOT NULL DEFAULT 'Untitled',
  views integer NOT NULL DEFAULT 0,
  likes integer NOT NULL DEFAULT 0,
  comments integer NOT NULL DEFAULT 0,
  watch_time_minutes integer NOT NULL DEFAULT 0,
  ctr_percent numeric NOT NULL DEFAULT 0,
  published_at timestamptz,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, youtube_video_id)
);

ALTER TABLE public.youtube_video_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view youtube_video_stats"
  ON public.youtube_video_stats FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Service can insert youtube_video_stats"
  ON public.youtube_video_stats FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Service can update youtube_video_stats"
  ON public.youtube_video_stats FOR UPDATE
  USING (public.is_workspace_member(workspace_id));

-- Growth goals
CREATE TABLE public.growth_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  title text NOT NULL DEFAULT 'Subscriber Goal',
  metric text NOT NULL DEFAULT 'subscribers',
  target_value integer NOT NULL DEFAULT 50000,
  current_value integer NOT NULL DEFAULT 0,
  start_date date,
  target_date date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.growth_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view growth_goals"
  ON public.growth_goals FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert growth_goals"
  ON public.growth_goals FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));

CREATE POLICY "Operators+ can update growth_goals"
  ON public.growth_goals FOR UPDATE
  USING (public.get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));
