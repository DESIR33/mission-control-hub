CREATE TABLE public.contact_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);

ALTER TABLE public.contact_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view contact_roles"
  ON public.contact_roles
  FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert contact_roles"
  ON public.contact_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (get_workspace_role(workspace_id) IN ('admin', 'operator', 'contributor'));

CREATE POLICY "Admins can delete contact_roles"
  ON public.contact_roles
  FOR DELETE
  TO authenticated
  USING (get_workspace_role(workspace_id) = 'admin');