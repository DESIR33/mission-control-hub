-- ============================================
-- FEATURE 7: CONTENT REPURPOSING TRACKER
-- ============================================

CREATE TABLE public.content_repurposes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_video_id INT NOT NULL REFERENCES public.video_queue(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('clip','short','reel','thread','carousel','post','newsletter','blog','other')),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','published')),
  published_url TEXT,
  published_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_repurposes_workspace ON public.content_repurposes(workspace_id);
CREATE INDEX idx_repurposes_source ON public.content_repurposes(source_video_id);

CREATE TRIGGER trg_repurposes_updated BEFORE UPDATE ON public.content_repurposes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.content_repurposes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view repurposes" ON public.content_repurposes
  FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Operators+ can insert repurposes" ON public.content_repurposes
  FOR INSERT WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Operators+ can update repurposes" ON public.content_repurposes
  FOR UPDATE USING (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Operators+ can delete repurposes" ON public.content_repurposes
  FOR DELETE USING (public.get_workspace_role(workspace_id) IN ('admin','operator'));
