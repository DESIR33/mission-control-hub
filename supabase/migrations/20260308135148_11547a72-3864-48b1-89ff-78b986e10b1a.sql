
-- Revenue transactions table for Stripe (and future PayPal) sync
CREATE TABLE public.revenue_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'stripe',
  external_id text NOT NULL,
  type text NOT NULL DEFAULT 'payment',
  status text NOT NULL DEFAULT 'succeeded',
  amount integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  description text,
  customer_id text,
  customer_email text,
  customer_name text,
  subscription_id text,
  product_name text,
  price_id text,
  interval text,
  metadata jsonb DEFAULT '{}'::jsonb,
  external_created_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, source, external_id)
);

-- RLS
ALTER TABLE public.revenue_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view revenue_transactions"
  ON public.revenue_transactions FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Service can insert revenue_transactions"
  ON public.revenue_transactions FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Service can update revenue_transactions"
  ON public.revenue_transactions FOR UPDATE
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Admins can delete revenue_transactions"
  ON public.revenue_transactions FOR DELETE
  TO authenticated
  USING (get_workspace_role(workspace_id) = 'admin');

-- Stripe sync log table
CREATE TABLE public.stripe_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'running',
  charges_synced integer DEFAULT 0,
  subscriptions_synced integer DEFAULT 0,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view stripe_sync_log"
  ON public.stripe_sync_log FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Service can manage stripe_sync_log"
  ON public.stripe_sync_log FOR ALL
  TO authenticated
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

-- Updated_at trigger
CREATE TRIGGER update_revenue_transactions_updated_at
  BEFORE UPDATE ON public.revenue_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_revenue_transactions_workspace ON public.revenue_transactions(workspace_id);
CREATE INDEX idx_revenue_transactions_source ON public.revenue_transactions(workspace_id, source);
CREATE INDEX idx_revenue_transactions_external_created ON public.revenue_transactions(external_created_at DESC);
CREATE INDEX idx_stripe_sync_log_workspace ON public.stripe_sync_log(workspace_id);
