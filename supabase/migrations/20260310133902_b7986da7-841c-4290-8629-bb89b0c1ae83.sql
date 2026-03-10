CREATE TABLE IF NOT EXISTS public.affiliate_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  affiliate_program_id uuid REFERENCES public.affiliate_programs(id) ON DELETE SET NULL,
  video_queue_id uuid DEFAULT NULL,
  sale_amount numeric(12,2) DEFAULT 0,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  transaction_date date,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view affiliate transactions"
  ON public.affiliate_transactions FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can insert affiliate transactions"
  ON public.affiliate_transactions FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can update affiliate transactions"
  ON public.affiliate_transactions FOR UPDATE
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can delete affiliate transactions"
  ON public.affiliate_transactions FOR DELETE
  TO authenticated
  USING (is_workspace_member(workspace_id));