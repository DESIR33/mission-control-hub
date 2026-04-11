
CREATE TABLE public.deal_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deal_id, contact_id)
);

ALTER TABLE public.deal_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view deal contacts"
  ON public.deal_contacts FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can create deal contacts"
  ON public.deal_contacts FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete deal contacts"
  ON public.deal_contacts FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE INDEX idx_deal_contacts_deal ON public.deal_contacts(deal_id);
CREATE INDEX idx_deal_contacts_contact ON public.deal_contacts(contact_id);
CREATE INDEX idx_deal_contacts_workspace ON public.deal_contacts(workspace_id);
