
-- 1. notifications
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  type text NOT NULL,
  title text NOT NULL,
  body text,
  entity_type text,
  entity_id uuid,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view notifications" ON public.notifications FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can update notifications" ON public.notifications FOR UPDATE USING (is_workspace_member(workspace_id));
CREATE POLICY "Operators+ can insert notifications" ON public.notifications FOR INSERT WITH CHECK (get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));
CREATE POLICY "Admins can delete notifications" ON public.notifications FOR DELETE USING (get_workspace_role(workspace_id) = 'admin');

-- 2. ai_proposals
CREATE TABLE public.ai_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'outreach',
  status text NOT NULL DEFAULT 'pending',
  contact_id uuid REFERENCES public.contacts(id),
  company_id uuid REFERENCES public.companies(id),
  content jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view ai_proposals" ON public.ai_proposals FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Operators+ can insert ai_proposals" ON public.ai_proposals FOR INSERT WITH CHECK (get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));
CREATE POLICY "Operators+ can update ai_proposals" ON public.ai_proposals FOR UPDATE USING (get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));
CREATE POLICY "Admins can delete ai_proposals" ON public.ai_proposals FOR DELETE USING (get_workspace_role(workspace_id) = 'admin');
CREATE TRIGGER update_ai_proposals_updated_at BEFORE UPDATE ON public.ai_proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. workspace_integrations
CREATE TABLE public.workspace_integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  integration_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  config jsonb,
  connected_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, integration_key)
);
ALTER TABLE public.workspace_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view workspace_integrations" ON public.workspace_integrations FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Admins can insert workspace_integrations" ON public.workspace_integrations FOR INSERT WITH CHECK (get_workspace_role(workspace_id) = 'admin');
CREATE POLICY "Admins can update workspace_integrations" ON public.workspace_integrations FOR UPDATE USING (get_workspace_role(workspace_id) = 'admin');
CREATE POLICY "Admins can delete workspace_integrations" ON public.workspace_integrations FOR DELETE USING (get_workspace_role(workspace_id) = 'admin');
CREATE TRIGGER update_workspace_integrations_updated_at BEFORE UPDATE ON public.workspace_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. video_queue
CREATE TABLE public.video_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'idea',
  priority text NOT NULL DEFAULT 'medium',
  scheduled_date date,
  published_url text,
  thumbnail_url text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.video_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view video_queue" ON public.video_queue FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Operators+ can insert video_queue" ON public.video_queue FOR INSERT WITH CHECK (get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));
CREATE POLICY "Operators+ can update video_queue" ON public.video_queue FOR UPDATE USING (get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));
CREATE POLICY "Admins can delete video_queue" ON public.video_queue FOR DELETE USING (get_workspace_role(workspace_id) = 'admin');
CREATE TRIGGER update_video_queue_updated_at BEFORE UPDATE ON public.video_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
