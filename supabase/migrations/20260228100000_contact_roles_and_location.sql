-- ============================================
-- Add contact_roles table
-- ============================================
CREATE TABLE public.contact_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, name)
);

CREATE INDEX idx_contact_roles_workspace ON public.contact_roles(workspace_id);

-- RLS policies for contact_roles
ALTER TABLE public.contact_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view contact roles" ON public.contact_roles
  FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert contact roles" ON public.contact_roles
  FOR INSERT WITH CHECK (
    public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
  );

CREATE POLICY "Operators+ can update contact roles" ON public.contact_roles
  FOR UPDATE USING (
    public.get_workspace_role(workspace_id) IN ('admin','operator','contributor')
  );

CREATE POLICY "Admins can delete contact roles" ON public.contact_roles
  FOR DELETE USING (
    public.get_workspace_role(workspace_id) = 'admin'
  );

-- ============================================
-- Add location and role_id fields to contacts
-- ============================================
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.contact_roles(id) ON DELETE SET NULL;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS country TEXT;

CREATE INDEX idx_contacts_role ON public.contacts(role_id);
