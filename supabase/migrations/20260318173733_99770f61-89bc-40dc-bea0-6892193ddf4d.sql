-- Step 1: Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_date TIMESTAMPTZ,
  entity_id UUID,
  entity_type TEXT,
  assigned_to UUID,
  created_by UUID,
  source TEXT DEFAULT 'manual',
  source_proposal_id UUID REFERENCES public.ai_proposals(id),
  recurrence_rule TEXT,
  category TEXT DEFAULT 'general',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_workspace ON public.tasks(workspace_id);
CREATE INDEX idx_tasks_status ON public.tasks(workspace_id, status);
CREATE INDEX idx_tasks_due ON public.tasks(workspace_id, due_date);
CREATE INDEX idx_tasks_source ON public.tasks(workspace_id, source);

CREATE TRIGGER trg_tasks_updated
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tasks" ON public.tasks
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Operators can insert tasks" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (
    public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
  );
CREATE POLICY "Operators can update tasks" ON public.tasks
  FOR UPDATE TO authenticated USING (
    public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
  );
CREATE POLICY "Admins can delete tasks" ON public.tasks
  FOR DELETE TO authenticated USING (
    public.get_workspace_role(workspace_id) IN ('admin','operator')
  );

-- Step 2: Expand notifications
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'overdue_task','deal_stage_change','new_contact','ai_proposal_ready',
    'deal_change','inbox_triage','briefing_task','follow_up_due',
    'content_gap','sprint_assignment','assistant_action',
    'content_pipeline','x_trend_idea'
  ));

-- Step 3: Add triage columns
ALTER TABLE public.inbox_emails ADD COLUMN IF NOT EXISTS ai_priority TEXT;
ALTER TABLE public.inbox_emails ADD COLUMN IF NOT EXISTS ai_intent TEXT;
ALTER TABLE public.inbox_emails ADD COLUMN IF NOT EXISTS ai_suggested_action TEXT;

-- Step 4: Assistant actions log
CREATE TABLE public.assistant_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  entity_type TEXT,
  entity_id UUID,
  proposal_id UUID REFERENCES public.ai_proposals(id),
  task_id UUID REFERENCES public.tasks(id),
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assistant_actions_workspace ON public.assistant_actions(workspace_id, created_at DESC);

ALTER TABLE public.assistant_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view assistant actions" ON public.assistant_actions
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Service can insert assistant actions" ON public.assistant_actions
  FOR INSERT TO authenticated WITH CHECK (
    public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
  );