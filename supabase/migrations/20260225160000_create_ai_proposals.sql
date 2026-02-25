-- ============================================
-- AI PROPOSALS TABLE
-- Stores AI-generated proposals for human review
-- ============================================
CREATE TABLE public.ai_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'deal', 'company')),
  entity_id UUID NOT NULL,
  proposal_type TEXT NOT NULL CHECK (proposal_type IN ('enrichment', 'outreach', 'deal_update', 'score_update', 'tag_suggestion')),
  title TEXT NOT NULL,
  summary TEXT,
  proposed_changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_proposals_workspace ON public.ai_proposals(workspace_id);
CREATE INDEX idx_ai_proposals_status ON public.ai_proposals(workspace_id, status);
CREATE INDEX idx_ai_proposals_entity ON public.ai_proposals(entity_id, entity_type);

-- Updated_at trigger
CREATE TRIGGER trg_ai_proposals_updated
  BEFORE UPDATE ON public.ai_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.ai_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view ai_proposals"
  ON public.ai_proposals FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert ai_proposals"
  ON public.ai_proposals FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin', 'operator', 'contributor'));

CREATE POLICY "Operators+ can update ai_proposals"
  ON public.ai_proposals FOR UPDATE
  USING (public.get_workspace_role(workspace_id) IN ('admin', 'operator', 'contributor'));

CREATE POLICY "Admins can delete ai_proposals"
  ON public.ai_proposals FOR DELETE
  USING (public.get_workspace_role(workspace_id) = 'admin');
