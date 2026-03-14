
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date DATE,
  issued_date DATE DEFAULT CURRENT_DATE,
  paid_date DATE,
  line_items JSONB DEFAULT '[]',
  notes TEXT,
  payment_terms TEXT DEFAULT 'Net 30',
  stripe_invoice_id TEXT,
  stripe_payment_url TEXT,
  brand_name TEXT,
  brand_logo_url TEXT,
  brand_address TEXT,
  client_name TEXT,
  client_email TEXT,
  client_address TEXT,
  viewed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, invoice_number)
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view invoices" ON public.invoices FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can insert invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Members can update invoices" ON public.invoices FOR UPDATE TO authenticated USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can delete invoices" ON public.invoices FOR DELETE TO authenticated USING (is_workspace_member(workspace_id));

CREATE INDEX idx_invoices_workspace ON public.invoices(workspace_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_deal ON public.invoices(deal_id);
CREATE INDEX idx_invoices_stripe ON public.invoices(stripe_invoice_id);
