-- ============================================
-- FEATURE 1: SRT UPLOAD & RETENTION ANALYSIS
-- ============================================

-- Video transcripts from SRT uploads
CREATE TABLE public.video_transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  video_queue_id INT REFERENCES public.video_queue(id) ON DELETE SET NULL,
  youtube_video_id TEXT,
  srt_raw TEXT NOT NULL,
  parsed_segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_video_transcripts_workspace ON public.video_transcripts(workspace_id);
CREATE INDEX idx_video_transcripts_video ON public.video_transcripts(video_queue_id);

-- Retention curve data per video
CREATE TABLE public.video_retention_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  video_queue_id INT REFERENCES public.video_queue(id) ON DELETE SET NULL,
  youtube_video_id TEXT,
  retention_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_video_retention_workspace ON public.video_retention_data(workspace_id);
CREATE INDEX idx_video_retention_video ON public.video_retention_data(video_queue_id);

-- RLS
ALTER TABLE public.video_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_retention_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view transcripts" ON public.video_transcripts
  FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Operators+ can insert transcripts" ON public.video_transcripts
  FOR INSERT WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Operators+ can update transcripts" ON public.video_transcripts
  FOR UPDATE USING (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Admins can delete transcripts" ON public.video_transcripts
  FOR DELETE USING (public.get_workspace_role(workspace_id) = 'admin');

CREATE POLICY "Members can view retention" ON public.video_retention_data
  FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Operators+ can insert retention" ON public.video_retention_data
  FOR INSERT WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Operators+ can update retention" ON public.video_retention_data
  FOR UPDATE USING (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Admins can delete retention" ON public.video_retention_data
  FOR DELETE USING (public.get_workspace_role(workspace_id) = 'admin');
