-- ============================================
-- Follow-up reminders table
-- ============================================
CREATE TABLE public.follow_up_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'company')),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  assigned_to UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_follow_up_reminders_workspace ON public.follow_up_reminders(workspace_id);
CREATE INDEX idx_follow_up_reminders_entity ON public.follow_up_reminders(entity_id, entity_type);
CREATE INDEX idx_follow_up_reminders_due ON public.follow_up_reminders(due_date) WHERE completed_at IS NULL;

-- RLS policies for follow_up_reminders
ALTER TABLE public.follow_up_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view follow-up reminders" ON public.follow_up_reminders
  FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert follow-up reminders" ON public.follow_up_reminders
  FOR INSERT WITH CHECK (
    public.get_workspace_role(workspace_id) IN ('admin', 'operator', 'contributor')
  );

CREATE POLICY "Operators+ can update follow-up reminders" ON public.follow_up_reminders
  FOR UPDATE USING (
    public.get_workspace_role(workspace_id) IN ('admin', 'operator', 'contributor')
  );
