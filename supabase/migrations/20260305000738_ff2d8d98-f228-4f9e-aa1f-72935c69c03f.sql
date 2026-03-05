
-- Retention curve data per video (stores audience retention at each elapsed time ratio)
CREATE TABLE public.youtube_video_retention (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  youtube_video_id text NOT NULL,
  elapsed_ratio numeric NOT NULL,        -- 0.0 to 1.0 (position in video)
  audience_retention numeric NOT NULL DEFAULT 0, -- 0.0 to 1.0 (relative retention)
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, youtube_video_id, elapsed_ratio)
);

CREATE INDEX idx_video_retention_ws_vid ON public.youtube_video_retention (workspace_id, youtube_video_id);

ALTER TABLE public.youtube_video_retention ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view youtube_video_retention"
  ON public.youtube_video_retention FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Service can insert youtube_video_retention"
  ON public.youtube_video_retention FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Service can update youtube_video_retention"
  ON public.youtube_video_retention FOR UPDATE
  TO authenticated
  USING (is_workspace_member(workspace_id));
