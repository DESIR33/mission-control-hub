
ALTER TABLE public.rate_card_items
  ADD COLUMN item_type text NOT NULL DEFAULT 'rate';

CREATE TABLE public.rate_card_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'general',
  content text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_card_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view rate card terms" ON public.rate_card_terms FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can insert rate card terms" ON public.rate_card_terms FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Members can update rate card terms" ON public.rate_card_terms FOR UPDATE TO authenticated USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can delete rate card terms" ON public.rate_card_terms FOR DELETE TO authenticated USING (is_workspace_member(workspace_id));

CREATE INDEX idx_rate_card_terms_workspace ON public.rate_card_terms(workspace_id, sort_order);
