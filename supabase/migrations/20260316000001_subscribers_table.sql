-- Subscribers table: Video subscriber CRM for audience leads
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','unsubscribed','bounced')),
  source TEXT DEFAULT 'website' CHECK (source IN ('website','youtube','manual','import')),
  source_video_id TEXT,
  source_video_title TEXT,
  guide_requested TEXT,
  guide_delivered_at TIMESTAMPTZ,
  avatar_url TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  custom_fields JSONB DEFAULT '{}',
  notes TEXT,
  engagement_score INT DEFAULT 0,
  engagement_data JSONB DEFAULT '{"emails_sent":0,"emails_opened":0,"emails_clicked":0,"guides_downloaded":0,"last_email_opened_at":null,"last_clicked_at":null}',
  opt_in_confirmed BOOLEAN DEFAULT false,
  opt_in_confirmed_at TIMESTAMPTZ,
  promoted_to_contact_id UUID REFERENCES public.contacts(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique email per workspace
CREATE UNIQUE INDEX idx_subscribers_workspace_email ON public.subscribers(workspace_id, email) WHERE deleted_at IS NULL;
CREATE INDEX idx_subscribers_status ON public.subscribers(workspace_id, status);
CREATE INDEX idx_subscribers_engagement ON public.subscribers(workspace_id, engagement_score);
CREATE INDEX idx_subscribers_created ON public.subscribers(workspace_id, created_at);

-- Enable RLS
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view subscribers" ON public.subscribers FOR SELECT
  USING (public.is_workspace_member(workspace_id) AND deleted_at IS NULL);

CREATE POLICY "Operators+ can insert subscribers" ON public.subscribers FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

CREATE POLICY "Operators+ can update subscribers" ON public.subscribers FOR UPDATE
  USING (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

CREATE POLICY "Admins can delete subscribers" ON public.subscribers FOR DELETE
  USING (public.get_workspace_role(workspace_id) = 'admin');

-- Subscriber tags
CREATE TABLE public.subscriber_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  auto_rule JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subscriber_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view subscriber_tags" ON public.subscriber_tags FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can manage subscriber_tags" ON public.subscriber_tags FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

CREATE POLICY "Operators+ can update subscriber_tags" ON public.subscriber_tags FOR UPDATE
  USING (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

CREATE POLICY "Operators+ can delete subscriber_tags" ON public.subscriber_tags FOR DELETE
  USING (public.get_workspace_role(workspace_id) IN ('admin','operator'));

-- Subscriber tag assignments (join table)
CREATE TABLE public.subscriber_tag_assignments (
  subscriber_id UUID NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.subscriber_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (subscriber_id, tag_id)
);

ALTER TABLE public.subscriber_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view subscriber_tag_assignments" ON public.subscriber_tag_assignments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.subscribers s WHERE s.id = subscriber_id AND public.is_workspace_member(s.workspace_id)));

CREATE POLICY "Operators+ can manage subscriber_tag_assignments" ON public.subscriber_tag_assignments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.subscribers s WHERE s.id = subscriber_id AND public.get_workspace_role(s.workspace_id) IN ('admin','operator','contributor')));

CREATE POLICY "Operators+ can delete subscriber_tag_assignments" ON public.subscriber_tag_assignments FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.subscribers s WHERE s.id = subscriber_id AND public.get_workspace_role(s.workspace_id) IN ('admin','operator')));

-- Subscriber guides
CREATE TABLE public.subscriber_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  delivery_type TEXT DEFAULT 'email' CHECK (delivery_type IN ('email','redirect')),
  file_url TEXT,
  email_subject TEXT,
  email_body TEXT,
  download_count INT DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_subscriber_guides_slug ON public.subscriber_guides(workspace_id, slug);

ALTER TABLE public.subscriber_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view subscriber_guides" ON public.subscriber_guides FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can manage subscriber_guides" ON public.subscriber_guides FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

CREATE POLICY "Operators+ can update subscriber_guides" ON public.subscriber_guides FOR UPDATE
  USING (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

CREATE POLICY "Operators+ can delete subscriber_guides" ON public.subscriber_guides FOR DELETE
  USING (public.get_workspace_role(workspace_id) IN ('admin','operator'));

-- Video notifications
CREATE TABLE public.subscriber_video_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  video_title TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  email_subject TEXT,
  email_body TEXT,
  total_recipients INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  opened_count INT DEFAULT 0,
  clicked_count INT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subscriber_video_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view subscriber_video_notifications" ON public.subscriber_video_notifications FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can manage subscriber_video_notifications" ON public.subscriber_video_notifications FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

CREATE POLICY "Operators+ can update subscriber_video_notifications" ON public.subscriber_video_notifications FOR UPDATE
  USING (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

-- Notification delivery logs (per subscriber)
CREATE TABLE public.subscriber_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.subscriber_video_notifications(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','opened','clicked','bounced','failed')),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

CREATE INDEX idx_notification_logs_notification ON public.subscriber_notification_logs(notification_id);
CREATE INDEX idx_notification_logs_subscriber ON public.subscriber_notification_logs(subscriber_id);

ALTER TABLE public.subscriber_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view subscriber_notification_logs" ON public.subscriber_notification_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.subscriber_video_notifications n WHERE n.id = notification_id AND public.is_workspace_member(n.workspace_id)));

CREATE POLICY "Operators+ can manage subscriber_notification_logs" ON public.subscriber_notification_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.subscriber_video_notifications n WHERE n.id = notification_id AND public.get_workspace_role(n.workspace_id) IN ('admin','operator','contributor')));

CREATE POLICY "Operators+ can update subscriber_notification_logs" ON public.subscriber_notification_logs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.subscriber_video_notifications n WHERE n.id = notification_id AND public.get_workspace_role(n.workspace_id) IN ('admin','operator','contributor')));

-- Subscriber sequences
CREATE TABLE public.subscriber_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT DEFAULT 'manual' CHECK (trigger_type IN ('manual','on_subscribe','on_guide_download','on_tag')),
  trigger_config JSONB DEFAULT '{}',
  steps JSONB NOT NULL DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subscriber_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view subscriber_sequences" ON public.subscriber_sequences FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can manage subscriber_sequences" ON public.subscriber_sequences FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

CREATE POLICY "Operators+ can update subscriber_sequences" ON public.subscriber_sequences FOR UPDATE
  USING (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

CREATE POLICY "Operators+ can delete subscriber_sequences" ON public.subscriber_sequences FOR DELETE
  USING (public.get_workspace_role(workspace_id) IN ('admin','operator'));

-- Subscriber sequence enrollments
CREATE TABLE public.subscriber_sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.subscriber_sequences(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  current_step INT DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','completed','unsubscribed')),
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  next_send_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_seq_enrollments_sequence ON public.subscriber_sequence_enrollments(sequence_id);
CREATE INDEX idx_seq_enrollments_subscriber ON public.subscriber_sequence_enrollments(subscriber_id);

ALTER TABLE public.subscriber_sequence_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view subscriber_sequence_enrollments" ON public.subscriber_sequence_enrollments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.subscriber_sequences s WHERE s.id = sequence_id AND public.is_workspace_member(s.workspace_id)));

CREATE POLICY "Operators+ can manage subscriber_sequence_enrollments" ON public.subscriber_sequence_enrollments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.subscriber_sequences s WHERE s.id = sequence_id AND public.get_workspace_role(s.workspace_id) IN ('admin','operator','contributor')));

CREATE POLICY "Operators+ can update subscriber_sequence_enrollments" ON public.subscriber_sequence_enrollments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.subscriber_sequences s WHERE s.id = sequence_id AND public.get_workspace_role(s.workspace_id) IN ('admin','operator','contributor')));

-- Subscriber engagement events
CREATE TABLE public.subscriber_engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('email_open','email_click','guide_download','video_notification_click','sequence_complete')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_engagement_events_subscriber ON public.subscriber_engagement_events(subscriber_id);
CREATE INDEX idx_engagement_events_type ON public.subscriber_engagement_events(workspace_id, event_type);

ALTER TABLE public.subscriber_engagement_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view subscriber_engagement_events" ON public.subscriber_engagement_events FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can manage subscriber_engagement_events" ON public.subscriber_engagement_events FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin','operator','contributor'));

-- Updated_at trigger for subscribers
CREATE OR REPLACE FUNCTION public.update_subscribers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscribers_updated_at
  BEFORE UPDATE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_subscribers_updated_at();
