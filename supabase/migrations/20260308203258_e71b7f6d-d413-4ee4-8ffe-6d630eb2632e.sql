
-- 1. Agent Workflows (Agent Chains)
CREATE TABLE public.agent_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  trigger_config jsonb DEFAULT '{}'::jsonb,
  enabled boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view agent_workflows" ON public.agent_workflows FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Admins can manage agent_workflows" ON public.agent_workflows FOR ALL USING (get_workspace_role(workspace_id) = 'admin') WITH CHECK (get_workspace_role(workspace_id) = 'admin');

CREATE TABLE public.agent_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.agent_workflows(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 0,
  agent_slug text NOT NULL,
  skill_slug text,
  input_template jsonb DEFAULT '{}'::jsonb,
  condition jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_workflow_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view workflow_steps" ON public.agent_workflow_steps FOR SELECT USING (EXISTS (SELECT 1 FROM agent_workflows w WHERE w.id = workflow_id AND is_workspace_member(w.workspace_id)));
CREATE POLICY "Admins can manage workflow_steps" ON public.agent_workflow_steps FOR ALL USING (EXISTS (SELECT 1 FROM agent_workflows w WHERE w.id = workflow_id AND get_workspace_role(w.workspace_id) = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM agent_workflows w WHERE w.id = workflow_id AND get_workspace_role(w.workspace_id) = 'admin'));

-- 2. Agent Feedback (Learning Loop)
CREATE TABLE public.agent_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  proposal_id uuid REFERENCES public.ai_proposals(id) ON DELETE SET NULL,
  agent_slug text NOT NULL,
  action text NOT NULL DEFAULT 'accepted', -- accepted, rejected, edited
  user_notes text,
  original_content jsonb DEFAULT '{}'::jsonb,
  edited_content jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.agent_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view agent_feedback" ON public.agent_feedback FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can insert agent_feedback" ON public.agent_feedback FOR INSERT WITH CHECK (is_workspace_member(workspace_id));

-- 3. Agent Custom Triggers (Natural Language)
CREATE TABLE public.agent_custom_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  natural_language_rule text NOT NULL,
  parsed_condition jsonb DEFAULT '{}'::jsonb,
  agent_slug text NOT NULL,
  skill_slug text,
  enabled boolean DEFAULT true,
  last_triggered_at timestamptz,
  trigger_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.agent_custom_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view agent_custom_triggers" ON public.agent_custom_triggers FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Admins can manage agent_custom_triggers" ON public.agent_custom_triggers FOR ALL USING (get_workspace_role(workspace_id) = 'admin') WITH CHECK (get_workspace_role(workspace_id) = 'admin');

-- 4. Email Follow-ups (Smart Follow-Up Queue)
CREATE TABLE public.email_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email_id uuid REFERENCES public.inbox_emails(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  reason text NOT NULL DEFAULT 'no_reply',
  priority text NOT NULL DEFAULT 'medium',
  suggested_action text,
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view email_follow_ups" ON public.email_follow_ups FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can manage email_follow_ups" ON public.email_follow_ups FOR ALL USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));

-- 5. Video Hourly Stats (First 48h Tracking)
CREATE TABLE public.video_hourly_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  youtube_video_id text NOT NULL,
  hour_number integer NOT NULL,
  views integer DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  ctr_percent numeric DEFAULT 0,
  impressions integer DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, youtube_video_id, hour_number)
);
ALTER TABLE public.video_hourly_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view video_hourly_stats" ON public.video_hourly_stats FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Service can manage video_hourly_stats" ON public.video_hourly_stats FOR ALL USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));

-- 6. Video Performance Alerts
CREATE TABLE public.video_performance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  youtube_video_id text NOT NULL,
  alert_type text NOT NULL DEFAULT 'trending', -- trending, underperforming, milestone
  message text NOT NULL,
  metric_name text,
  metric_value numeric,
  threshold_value numeric,
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.video_performance_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view video_performance_alerts" ON public.video_performance_alerts FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can update video_performance_alerts" ON public.video_performance_alerts FOR UPDATE USING (is_workspace_member(workspace_id));
CREATE POLICY "Service can insert video_performance_alerts" ON public.video_performance_alerts FOR INSERT WITH CHECK (is_workspace_member(workspace_id));

-- 7. Video Sponsor Segments (Revenue Attribution)
CREATE TABLE public.video_sponsor_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  youtube_video_id text NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  start_seconds integer NOT NULL DEFAULT 0,
  end_seconds integer NOT NULL DEFAULT 0,
  segment_type text NOT NULL DEFAULT 'midroll', -- preroll, midroll, postroll, dedicated
  estimated_viewers integer,
  retention_at_segment numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.video_sponsor_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view video_sponsor_segments" ON public.video_sponsor_segments FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Operators+ can manage video_sponsor_segments" ON public.video_sponsor_segments FOR ALL USING (get_workspace_role(workspace_id) = ANY(ARRAY['admin','operator','contributor'])) WITH CHECK (get_workspace_role(workspace_id) = ANY(ARRAY['admin','operator','contributor']));

-- 8. Content Decay Alerts
CREATE TABLE public.content_decay_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  youtube_video_id text NOT NULL,
  video_title text NOT NULL DEFAULT '',
  decay_type text NOT NULL DEFAULT 'traffic_drop', -- traffic_drop, ctr_decline, engagement_drop
  current_value numeric,
  previous_value numeric,
  decline_percent numeric,
  suggested_actions jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active', -- active, dismissed, actioned
  created_at timestamptz NOT NULL DEFAULT now(),
  actioned_at timestamptz
);
ALTER TABLE public.content_decay_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view content_decay_alerts" ON public.content_decay_alerts FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can manage content_decay_alerts" ON public.content_decay_alerts FOR ALL USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));
