-- ============================================
-- FEATURE 10: WEEKLY PERFORMANCE REPORT
-- ============================================

CREATE TABLE public.weekly_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_weekly_reports_workspace ON public.weekly_reports(workspace_id);
CREATE UNIQUE INDEX idx_weekly_reports_date ON public.weekly_reports(workspace_id, report_date);

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view reports" ON public.weekly_reports
  FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Operators+ can insert reports" ON public.weekly_reports
  FOR INSERT WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator'));
