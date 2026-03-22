
-- Newsletter Issues / Campaigns
CREATE TABLE public.newsletter_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','archived')),
  segment_filter jsonb DEFAULT '{}',
  scheduled_at timestamptz,
  sent_at timestamptz,
  total_recipients int NOT NULL DEFAULT 0,
  sent_count int NOT NULL DEFAULT 0,
  opened_count int NOT NULL DEFAULT 0,
  clicked_count int NOT NULL DEFAULT 0,
  replied_count int NOT NULL DEFAULT 0,
  unsubscribed_count int NOT NULL DEFAULT 0,
  bounced_count int NOT NULL DEFAULT 0,
  conversion_to_lead int NOT NULL DEFAULT 0,
  conversion_to_deal int NOT NULL DEFAULT 0,
  topic_tags text[] DEFAULT '{}',
  ab_test_config jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.newsletter_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage newsletter_issues"
  ON public.newsletter_issues FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Per-issue segment performance
CREATE TABLE public.newsletter_segment_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.newsletter_issues(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  segment_name text NOT NULL,
  recipient_count int NOT NULL DEFAULT 0,
  open_count int NOT NULL DEFAULT 0,
  click_count int NOT NULL DEFAULT 0,
  unsubscribe_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.newsletter_segment_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage newsletter_segment_stats"
  ON public.newsletter_segment_stats FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Subscriber referrals
CREATE TABLE public.subscriber_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referral_code text NOT NULL,
  reward_type text DEFAULT 'none' CHECK (reward_type IN ('none','points','discount','feature_unlock')),
  reward_value numeric DEFAULT 0,
  reward_granted_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rewarded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, referrer_id, referred_id)
);
ALTER TABLE public.subscriber_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage subscriber_referrals"
  ON public.subscriber_referrals FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Unsubscribe reasons
CREATE TABLE public.subscriber_unsubscribe_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL,
  reason_category text NOT NULL DEFAULT 'other' CHECK (reason_category IN ('too_frequent','not_relevant','never_subscribed','too_many_emails','content_quality','other')),
  reason_text text,
  issue_id uuid REFERENCES public.newsletter_issues(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriber_unsubscribe_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage unsubscribe_reasons"
  ON public.subscriber_unsubscribe_reasons FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Churn risk scores
CREATE TABLE public.subscriber_churn_risk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL,
  risk_score numeric NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level text NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low','medium','high','critical')),
  declining_opens boolean DEFAULT false,
  declining_clicks boolean DEFAULT false,
  days_since_last_open int,
  days_since_last_click int,
  recent_open_rate numeric DEFAULT 0,
  recent_click_rate numeric DEFAULT 0,
  reengagement_sequence_id uuid,
  reengagement_status text DEFAULT 'none' CHECK (reengagement_status IN ('none','enrolled','completed','recovered','churned')),
  last_calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, subscriber_id)
);
ALTER TABLE public.subscriber_churn_risk ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage churn_risk"
  ON public.subscriber_churn_risk FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Topic-level retention tracking
CREATE TABLE public.newsletter_topic_retention (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  topic text NOT NULL,
  total_sent int NOT NULL DEFAULT 0,
  total_opened int NOT NULL DEFAULT 0,
  total_clicked int NOT NULL DEFAULT 0,
  total_unsubscribed int NOT NULL DEFAULT 0,
  avg_open_rate numeric DEFAULT 0,
  avg_click_rate numeric DEFAULT 0,
  retention_score numeric DEFAULT 0,
  last_calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, topic)
);
ALTER TABLE public.newsletter_topic_retention ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage topic_retention"
  ON public.newsletter_topic_retention FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Reengagement A/B test results
CREATE TABLE public.reengagement_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sequence_id uuid,
  name text NOT NULL,
  variant_a_subject text NOT NULL,
  variant_b_subject text NOT NULL,
  variant_a_sent int NOT NULL DEFAULT 0,
  variant_a_opened int NOT NULL DEFAULT 0,
  variant_b_sent int NOT NULL DEFAULT 0,
  variant_b_opened int NOT NULL DEFAULT 0,
  winner text CHECK (winner IN ('a','b',NULL)),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.reengagement_ab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage reengagement_ab_tests"
  ON public.reengagement_ab_tests FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Triggers for updated_at
CREATE TRIGGER update_newsletter_issues_updated_at BEFORE UPDATE ON public.newsletter_issues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_churn_risk_updated_at BEFORE UPDATE ON public.subscriber_churn_risk FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
