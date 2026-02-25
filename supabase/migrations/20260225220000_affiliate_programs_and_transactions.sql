-- ============================================
-- AFFILIATE PROGRAMS
-- ============================================
CREATE TABLE public.affiliate_programs (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  dashboard_url TEXT,
  commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  payout_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (payout_frequency IN ('weekly','biweekly','monthly','quarterly','annually')),
  next_payout_date DATE,
  affiliate_links TEXT[] DEFAULT '{}',
  minimum_payout NUMERIC(10,2) DEFAULT 0,
  payment_methods TEXT[] DEFAULT '{}',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_affiliate_programs_workspace ON public.affiliate_programs(workspace_id);
CREATE INDEX idx_affiliate_programs_company ON public.affiliate_programs(company_id);

CREATE TRIGGER trg_affiliate_programs_updated
  BEFORE UPDATE ON public.affiliate_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- AFFILIATE TRANSACTIONS
-- ============================================
CREATE TABLE public.affiliate_transactions (
  id BIGSERIAL PRIMARY KEY,
  affiliate_program_id BIGINT NOT NULL REFERENCES public.affiliate_programs(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  approximate_payout_date DATE,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_months INT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_affiliate_transactions_program ON public.affiliate_transactions(affiliate_program_id);
CREATE INDEX idx_affiliate_transactions_workspace ON public.affiliate_transactions(workspace_id);
CREATE INDEX idx_affiliate_transactions_status ON public.affiliate_transactions(status);

CREATE TRIGGER trg_affiliate_transactions_updated
  BEFORE UPDATE ON public.affiliate_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RLS POLICIES - AFFILIATE PROGRAMS
-- ============================================
ALTER TABLE public.affiliate_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view affiliate programs"
  ON public.affiliate_programs FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert affiliate programs"
  ON public.affiliate_programs FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

CREATE POLICY "Operators+ can update affiliate programs"
  ON public.affiliate_programs FOR UPDATE
  USING (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

CREATE POLICY "Admins can delete affiliate programs"
  ON public.affiliate_programs FOR DELETE
  USING (public.get_workspace_role(workspace_id) = 'admin');

-- ============================================
-- RLS POLICIES - AFFILIATE TRANSACTIONS
-- ============================================
ALTER TABLE public.affiliate_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view affiliate transactions"
  ON public.affiliate_transactions FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert affiliate transactions"
  ON public.affiliate_transactions FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

CREATE POLICY "Operators+ can update affiliate transactions"
  ON public.affiliate_transactions FOR UPDATE
  USING (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

CREATE POLICY "Admins can delete affiliate transactions"
  ON public.affiliate_transactions FOR DELETE
  USING (public.get_workspace_role(workspace_id) = 'admin');
