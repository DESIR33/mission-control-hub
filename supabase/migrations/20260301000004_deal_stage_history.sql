-- ============================================
-- FEATURE 4: DEAL PIPELINE VELOCITY & STAGE ANALYTICS
-- ============================================

CREATE TABLE public.deal_stage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID
);

CREATE INDEX idx_deal_stage_history_workspace ON public.deal_stage_history(workspace_id);
CREATE INDEX idx_deal_stage_history_deal ON public.deal_stage_history(deal_id);
CREATE INDEX idx_deal_stage_history_changed ON public.deal_stage_history(changed_at);

-- Trigger to auto-record stage changes
CREATE OR REPLACE FUNCTION public.record_deal_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.deal_stage_history (workspace_id, deal_id, from_stage, to_stage, changed_by)
    VALUES (NEW.workspace_id, NEW.id, OLD.stage, NEW.stage, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create if not already present from a prior migration
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_record_stage_change') THEN
    CREATE TRIGGER trg_record_stage_change
      AFTER UPDATE ON public.deals
      FOR EACH ROW
      EXECUTE FUNCTION public.record_deal_stage_change();
  END IF;
END;
$$;

-- RLS
ALTER TABLE public.deal_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view stage history" ON public.deal_stage_history
  FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "System can insert stage history" ON public.deal_stage_history
  FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id));
