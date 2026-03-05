-- Create affiliate_programs table
CREATE TABLE public.affiliate_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  company_id UUID REFERENCES public.companies(id),
  dashboard_url TEXT,
  commission_percentage NUMERIC NOT NULL DEFAULT 0,
  payout_frequency TEXT NOT NULL DEFAULT 'monthly',
  next_payout_date DATE,
  affiliate_links JSONB DEFAULT '[]'::jsonb,
  minimum_payout NUMERIC NOT NULL DEFAULT 0,
  payment_methods JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view affiliate_programs"
  ON public.affiliate_programs FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert affiliate_programs"
  ON public.affiliate_programs FOR INSERT
  WITH CHECK (get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));

CREATE POLICY "Operators+ can update affiliate_programs"
  ON public.affiliate_programs FOR UPDATE
  USING (get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));

CREATE POLICY "Admins can delete affiliate_programs"
  ON public.affiliate_programs FOR DELETE
  USING (get_workspace_role(workspace_id) = 'admin');

CREATE TRIGGER update_affiliate_programs_updated_at
  BEFORE UPDATE ON public.affiliate_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();