
CREATE TABLE public.task_saved_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  view_type TEXT NOT NULL CHECK (view_type IN ('list','board','calendar','inbox')),
  filters JSONB DEFAULT '{}'::jsonb,
  sort_config JSONB DEFAULT '{}'::jsonb,
  group_by TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved views"
  ON public.task_saved_views FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

CREATE POLICY "Users can create their own saved views"
  ON public.task_saved_views FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

CREATE POLICY "Users can update their own saved views"
  ON public.task_saved_views FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

CREATE POLICY "Users can delete their own saved views"
  ON public.task_saved_views FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

CREATE INDEX idx_task_saved_views_user ON public.task_saved_views(user_id, workspace_id);

CREATE TRIGGER update_task_saved_views_updated_at
  BEFORE UPDATE ON public.task_saved_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
