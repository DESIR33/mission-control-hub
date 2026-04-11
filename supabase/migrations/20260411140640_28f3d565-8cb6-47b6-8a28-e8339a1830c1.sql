
-- Add project_id to expenses
ALTER TABLE public.expenses
ADD COLUMN project_id UUID REFERENCES public.task_projects(id) ON DELETE SET NULL;

CREATE INDEX idx_expenses_project_id ON public.expenses(project_id);

-- Add project_id to revenue_transactions
ALTER TABLE public.revenue_transactions
ADD COLUMN project_id UUID REFERENCES public.task_projects(id) ON DELETE SET NULL;

CREATE INDEX idx_revenue_transactions_project_id ON public.revenue_transactions(project_id);

-- Add project_id to deals
ALTER TABLE public.deals
ADD COLUMN project_id UUID REFERENCES public.task_projects(id) ON DELETE SET NULL;

CREATE INDEX idx_deals_project_id ON public.deals(project_id);

-- Junction table: project <-> contacts
CREATE TABLE public.project_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.task_projects(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, contact_id)
);

ALTER TABLE public.project_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view project contacts"
  ON public.project_contacts FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can create project contacts"
  ON public.project_contacts FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can delete project contacts"
  ON public.project_contacts FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- Junction table: project <-> companies
CREATE TABLE public.project_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.task_projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, company_id)
);

ALTER TABLE public.project_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view project companies"
  ON public.project_companies FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can create project companies"
  ON public.project_companies FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can delete project companies"
  ON public.project_companies FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id));
