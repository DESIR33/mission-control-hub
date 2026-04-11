
-- Table to store AI-extracted context from emails linked to deals
CREATE TABLE public.deal_email_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  email_id UUID NOT NULL REFERENCES public.inbox_emails(id) ON DELETE CASCADE,
  ai_summary TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  deal_stage_signal TEXT,
  sentiment TEXT DEFAULT 'neutral',
  key_points JSONB DEFAULT '[]'::jsonb,
  linked_by TEXT NOT NULL DEFAULT 'auto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deal_id, email_id)
);

ALTER TABLE public.deal_email_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view deal email context"
  ON public.deal_email_context FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can create deal email context"
  ON public.deal_email_context FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update deal email context"
  ON public.deal_email_context FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete deal email context"
  ON public.deal_email_context FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE INDEX idx_deal_email_context_deal ON public.deal_email_context(deal_id);
CREATE INDEX idx_deal_email_context_email ON public.deal_email_context(email_id);
CREATE INDEX idx_deal_email_context_workspace ON public.deal_email_context(workspace_id);

-- Table to store AI-generated tasks from deal email analysis
CREATE TABLE public.deal_email_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  email_id UUID REFERENCES public.inbox_emails(id) ON DELETE SET NULL,
  task_title TEXT NOT NULL,
  task_description TEXT,
  suggested_priority TEXT DEFAULT 'medium',
  suggested_due_date DATE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_email_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view deal email tasks"
  ON public.deal_email_tasks FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can create deal email tasks"
  ON public.deal_email_tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update deal email tasks"
  ON public.deal_email_tasks FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete deal email tasks"
  ON public.deal_email_tasks FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE INDEX idx_deal_email_tasks_deal ON public.deal_email_tasks(deal_id);
CREATE INDEX idx_deal_email_tasks_status ON public.deal_email_tasks(status);
CREATE INDEX idx_deal_email_tasks_workspace ON public.deal_email_tasks(workspace_id);

-- Triggers for updated_at
CREATE TRIGGER update_deal_email_context_updated_at
  BEFORE UPDATE ON public.deal_email_context
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deal_email_tasks_updated_at
  BEFORE UPDATE ON public.deal_email_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
