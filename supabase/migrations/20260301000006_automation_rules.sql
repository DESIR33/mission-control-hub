-- ============================================
-- FEATURE 8: AUTOMATED FOLLOW-UP GENERATION
-- ============================================

CREATE TABLE public.automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('deal_stale','contact_inactive','post_publish_followup')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_automation_rules_workspace ON public.automation_rules(workspace_id);

CREATE TRIGGER trg_automation_rules_updated BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view rules" ON public.automation_rules
  FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Admins can insert rules" ON public.automation_rules
  FOR INSERT WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator'));
CREATE POLICY "Admins can update rules" ON public.automation_rules
  FOR UPDATE USING (public.get_workspace_role(workspace_id) IN ('admin','operator'));
CREATE POLICY "Admins can delete rules" ON public.automation_rules
  FOR DELETE USING (public.get_workspace_role(workspace_id) = 'admin');
