
-- Email categories for AI classification
ALTER TABLE public.inbox_emails ADD COLUMN IF NOT EXISTS ai_category text DEFAULT NULL;
ALTER TABLE public.inbox_emails ADD COLUMN IF NOT EXISTS ai_summary text DEFAULT NULL;

-- Agent scorecards: track acceptance rates per agent
CREATE TABLE IF NOT EXISTS public.agent_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_slug text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_proposals integer NOT NULL DEFAULT 0,
  accepted_proposals integer NOT NULL DEFAULT 0,
  rejected_proposals integer NOT NULL DEFAULT 0,
  avg_confidence numeric DEFAULT 0,
  outcomes_tracked integer NOT NULL DEFAULT 0,
  outcome_success_rate numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, agent_slug, period_start)
);

ALTER TABLE public.agent_scorecards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view agent_scorecards" ON public.agent_scorecards
  FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));

CREATE POLICY "Service can manage agent_scorecards" ON public.agent_scorecards
  FOR ALL TO authenticated USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

-- Email templates for smart replies
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  subject_template text NOT NULL DEFAULT '',
  body_template text NOT NULL DEFAULT '',
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view email_templates" ON public.email_templates
  FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can manage email_templates" ON public.email_templates
  FOR ALL TO authenticated USING (get_workspace_role(workspace_id) IN ('admin', 'operator', 'contributor'))
  WITH CHECK (get_workspace_role(workspace_id) IN ('admin', 'operator', 'contributor'));

-- Revenue attribution per video
CREATE TABLE IF NOT EXISTS public.video_revenue_attribution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  youtube_video_id text NOT NULL,
  video_title text NOT NULL DEFAULT '',
  ad_revenue numeric DEFAULT 0,
  sponsor_revenue numeric DEFAULT 0,
  affiliate_revenue numeric DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, youtube_video_id, period_start)
);

ALTER TABLE public.video_revenue_attribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view video_revenue_attribution" ON public.video_revenue_attribution
  FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));

CREATE POLICY "Service can manage video_revenue_attribution" ON public.video_revenue_attribution
  FOR ALL TO authenticated USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));
