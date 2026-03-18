
-- Products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'digital' CHECK (type IN ('digital', 'physical')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view products" ON public.products
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can insert products" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update products" ON public.products
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can delete products" ON public.products
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Product transactions table
CREATE TABLE public.product_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  total_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  transaction_date timestamptz NOT NULL DEFAULT now(),
  payment_method text DEFAULT '',
  is_paid boolean DEFAULT false,
  platform text DEFAULT '',
  commission numeric DEFAULT 0,
  approximate_payout_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view product_transactions" ON public.product_transactions
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can insert product_transactions" ON public.product_transactions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update product_transactions" ON public.product_transactions
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can delete product_transactions" ON public.product_transactions
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE TRIGGER update_product_transactions_updated_at
  BEFORE UPDATE ON public.product_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
