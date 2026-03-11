
CREATE TABLE public.rate_card_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'video',
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_card_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view rate card items"
  ON public.rate_card_items FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can insert rate card items"
  ON public.rate_card_items FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can update rate card items"
  ON public.rate_card_items FOR UPDATE
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can delete rate card items"
  ON public.rate_card_items FOR DELETE
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE INDEX idx_rate_card_items_workspace ON public.rate_card_items(workspace_id, sort_order);
