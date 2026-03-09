
CREATE TABLE public.competitor_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel_name text NOT NULL,
  channel_url text,
  youtube_channel_id text,
  subscriber_count bigint,
  video_count integer,
  total_view_count bigint,
  avg_views_per_video integer,
  avg_ctr numeric,
  upload_frequency text,
  primary_niche text,
  notes text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.competitor_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view competitor channels"
  ON public.competitor_channels FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can insert competitor channels"
  ON public.competitor_channels FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update competitor channels"
  ON public.competitor_channels FOR UPDATE
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can delete competitor channels"
  ON public.competitor_channels FOR DELETE
  TO authenticated
  USING (public.is_workspace_member(workspace_id));
