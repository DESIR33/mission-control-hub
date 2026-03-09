
-- 1. Agent Learning Preferences table (Feature 1: Agent Memory & Learning Loop)
CREATE TABLE public.agent_learning_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_slug text NOT NULL,
  preference_type text NOT NULL DEFAULT 'content_style', -- content_style, topic, format, timing
  preference_value text NOT NULL,
  weight numeric NOT NULL DEFAULT 1.0, -- positive = preferred, negative = disliked
  learned_from_count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, agent_slug, preference_type, preference_value)
);
ALTER TABLE public.agent_learning_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_members_can_manage_agent_prefs" ON public.agent_learning_preferences
  FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- 2. Agent alert thresholds table (Feature 3: Smart Agent Alerts)
CREATE TABLE public.agent_alert_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_slug text NOT NULL,
  metric_name text NOT NULL,
  condition text NOT NULL DEFAULT 'drops_below', -- drops_below, exceeds, changes_by_percent
  threshold_value numeric NOT NULL,
  cooldown_hours int NOT NULL DEFAULT 24,
  enabled boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  trigger_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_alert_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_members_can_manage_alert_thresholds" ON public.agent_alert_thresholds
  FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- 3. Email deal suggestions table (Feature 4: Email-to-Deal Auto-Linking)
CREATE TABLE public.email_deal_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email_id uuid REFERENCES public.inbox_emails(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  suggestion_type text NOT NULL DEFAULT 'link_deal', -- link_deal, create_deal, update_stage
  suggested_stage text,
  suggested_value numeric,
  confidence numeric DEFAULT 0.5,
  context_snippet text,
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, dismissed
  created_at timestamptz NOT NULL DEFAULT now(),
  actioned_at timestamptz
);
ALTER TABLE public.email_deal_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_members_can_manage_email_deal_suggestions" ON public.email_deal_suggestions
  FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- 4. Company health scores table (Feature 6)
CREATE TABLE public.company_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  overall_score int NOT NULL DEFAULT 50,
  engagement_score int NOT NULL DEFAULT 50,
  response_score int NOT NULL DEFAULT 50,
  deal_velocity_score int NOT NULL DEFAULT 50,
  revenue_score int NOT NULL DEFAULT 50,
  recency_score int NOT NULL DEFAULT 50,
  risk_level text NOT NULL DEFAULT 'healthy', -- healthy, at_risk, churning
  risk_factors jsonb DEFAULT '[]'::jsonb,
  last_calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, company_id)
);
ALTER TABLE public.company_health_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_members_can_manage_health_scores" ON public.company_health_scores
  FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- 5. Company intel tracking table (Feature 7: Competitive Intelligence)
CREATE TABLE public.company_intel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  intel_type text NOT NULL DEFAULT 'social_post', -- social_post, product_launch, content, news
  source text NOT NULL DEFAULT 'x', -- x, linkedin, web
  title text NOT NULL,
  summary text,
  source_url text,
  relevance_score numeric DEFAULT 0.5,
  metadata jsonb DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.company_intel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_members_can_manage_company_intel" ON public.company_intel
  FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- 6. Video series table (Feature 9: Revenue Attribution per Video Series)
CREATE TABLE public.video_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.video_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_members_can_manage_video_series" ON public.video_series
  FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE TABLE public.video_series_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  series_id uuid NOT NULL REFERENCES public.video_series(id) ON DELETE CASCADE,
  youtube_video_id text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, series_id, youtube_video_id)
);
ALTER TABLE public.video_series_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_members_can_manage_video_series_items" ON public.video_series_items
  FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- 7. Audience overlap detection results (Feature 10)
CREATE TABLE public.audience_overlap_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  video_a_id text NOT NULL,
  video_b_id text NOT NULL,
  overlap_type text NOT NULL DEFAULT 'keyword', -- keyword, audience, topic
  overlap_score numeric NOT NULL DEFAULT 0,
  shared_keywords text[] DEFAULT '{}',
  recommendation text,
  status text NOT NULL DEFAULT 'active', -- active, dismissed, actioned
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audience_overlap_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_members_can_manage_overlap_reports" ON public.audience_overlap_reports
  FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));
