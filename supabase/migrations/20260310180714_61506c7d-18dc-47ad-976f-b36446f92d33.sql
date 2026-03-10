
CREATE TABLE public.manual_adsense_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  month text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, month)
);

ALTER TABLE public.manual_adsense_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view manual adsense revenue"
  ON public.manual_adsense_revenue FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can insert manual adsense revenue"
  ON public.manual_adsense_revenue FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can update manual adsense revenue"
  ON public.manual_adsense_revenue FOR UPDATE
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can delete manual adsense revenue"
  ON public.manual_adsense_revenue FOR DELETE
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE TRIGGER update_manual_adsense_revenue_updated_at
  BEFORE UPDATE ON public.manual_adsense_revenue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
