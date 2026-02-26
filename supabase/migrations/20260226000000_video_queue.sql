-- ============================================
-- VIDEO QUEUE
-- ============================================
CREATE TABLE public.video_queue (
  id SERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'idea' CHECK (status IN ('idea','scripting','recording','editing','scheduled','published')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  target_publish_date TIMESTAMPTZ,
  platforms TEXT[] DEFAULT '{}',
  is_sponsored BOOLEAN NOT NULL DEFAULT FALSE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  sponsoring_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  assigned_to UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_video_queue_workspace ON public.video_queue(workspace_id);
CREATE INDEX idx_video_queue_status ON public.video_queue(workspace_id, status);

CREATE TRIGGER trg_video_queue_updated BEFORE UPDATE ON public.video_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- VIDEO QUEUE CHECKLISTS
-- ============================================
CREATE TABLE public.video_queue_checklists (
  id SERIAL PRIMARY KEY,
  video_queue_id INT NOT NULL REFERENCES public.video_queue(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vq_checklists_video ON public.video_queue_checklists(video_queue_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.video_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view video queue" ON public.video_queue
  FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert video queue" ON public.video_queue
  FOR INSERT WITH CHECK (
    public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
  );

CREATE POLICY "Operators+ can update video queue" ON public.video_queue
  FOR UPDATE USING (
    public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
  );

CREATE POLICY "Admins can delete video queue" ON public.video_queue
  FOR DELETE USING (
    public.get_workspace_role(workspace_id) = 'admin'
  );

ALTER TABLE public.video_queue_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view checklists" ON public.video_queue_checklists
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.video_queue vq WHERE vq.id = video_queue_id AND public.is_workspace_member(vq.workspace_id))
  );

CREATE POLICY "Operators+ can insert checklists" ON public.video_queue_checklists
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.video_queue vq WHERE vq.id = video_queue_id AND public.get_workspace_role(vq.workspace_id) IN ('admin','operator','contributor'))
  );

CREATE POLICY "Operators+ can update checklists" ON public.video_queue_checklists
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.video_queue vq WHERE vq.id = video_queue_id AND public.get_workspace_role(vq.workspace_id) IN ('admin','operator','contributor'))
  );

CREATE POLICY "Operators+ can delete checklists" ON public.video_queue_checklists
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.video_queue vq WHERE vq.id = video_queue_id AND public.get_workspace_role(vq.workspace_id) IN ('admin','operator'))
  );
