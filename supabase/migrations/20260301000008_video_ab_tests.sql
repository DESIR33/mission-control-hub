-- ============================================
-- FEATURE 11: A/B TITLE & THUMBNAIL TESTING TRACKER
-- ============================================

CREATE TABLE public.video_ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  video_queue_id INT REFERENCES public.video_queue(id) ON DELETE SET NULL,
  youtube_video_id TEXT,
  test_type TEXT NOT NULL CHECK (test_type IN ('title','thumbnail')),
  variant_a TEXT NOT NULL,
  variant_b TEXT NOT NULL,
  variant_a_ctr NUMERIC(5,2),
  variant_b_ctr NUMERIC(5,2),
  variant_a_views INT,
  variant_b_views INT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  winner TEXT CHECK (winner IN ('a','b','inconclusive')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ab_tests_workspace ON public.video_ab_tests(workspace_id);
CREATE INDEX idx_ab_tests_video ON public.video_ab_tests(video_queue_id);

ALTER TABLE public.video_ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view ab tests" ON public.video_ab_tests
  FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Operators+ can insert ab tests" ON public.video_ab_tests
  FOR INSERT WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Operators+ can update ab tests" ON public.video_ab_tests
  FOR UPDATE USING (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Admins can delete ab tests" ON public.video_ab_tests
  FOR DELETE USING (public.get_workspace_role(workspace_id) = 'admin');
