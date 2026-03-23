
-- Add is_agency flag to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_agency boolean NOT NULL DEFAULT false;

-- Create junction table for agency-client company relationships
CREATE TABLE public.company_agency_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, client_company_id)
);

-- RLS
ALTER TABLE public.company_agency_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view agency links" ON public.company_agency_links
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can insert agency links" ON public.company_agency_links
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can delete agency links" ON public.company_agency_links
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update agency links" ON public.company_agency_links
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- Updated_at trigger
CREATE TRIGGER update_company_agency_links_updated_at
  BEFORE UPDATE ON public.company_agency_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
