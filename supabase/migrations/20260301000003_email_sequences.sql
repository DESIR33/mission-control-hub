-- ============================================
-- FEATURE 3: SPONSOR OUTREACH EMAIL SEQUENCES
-- ============================================

CREATE TABLE public.email_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_sequences_workspace ON public.email_sequences(workspace_id);

CREATE TRIGGER trg_email_sequences_updated BEFORE UPDATE ON public.email_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.email_sequence_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  current_step INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','replied')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_send_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_enrollments_workspace ON public.email_sequence_enrollments(workspace_id);
CREATE INDEX idx_enrollments_sequence ON public.email_sequence_enrollments(sequence_id);
CREATE INDEX idx_enrollments_contact ON public.email_sequence_enrollments(contact_id);
CREATE INDEX idx_enrollments_next_send ON public.email_sequence_enrollments(next_send_at) WHERE status = 'active';

-- RLS
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequence_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view sequences" ON public.email_sequences
  FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Operators+ can insert sequences" ON public.email_sequences
  FOR INSERT WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Operators+ can update sequences" ON public.email_sequences
  FOR UPDATE USING (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Admins can delete sequences" ON public.email_sequences
  FOR DELETE USING (public.get_workspace_role(workspace_id) = 'admin');

CREATE POLICY "Members can view enrollments" ON public.email_sequence_enrollments
  FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Operators+ can insert enrollments" ON public.email_sequence_enrollments
  FOR INSERT WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Operators+ can update enrollments" ON public.email_sequence_enrollments
  FOR UPDATE USING (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));
CREATE POLICY "Admins can delete enrollments" ON public.email_sequence_enrollments
  FOR DELETE USING (public.get_workspace_role(workspace_id) = 'admin');
