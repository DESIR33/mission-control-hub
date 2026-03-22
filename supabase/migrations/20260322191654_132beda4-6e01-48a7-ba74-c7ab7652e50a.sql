
-- Track click/reply events per issue linking to CRM contacts and deals
CREATE TABLE public.newsletter_click_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  issue_id uuid NOT NULL,
  subscriber_email text NOT NULL,
  event_type text NOT NULL DEFAULT 'click',
  link_url text,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.newsletter_click_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage click_events"
  ON public.newsletter_click_events FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));
CREATE INDEX idx_click_events_issue ON public.newsletter_click_events(issue_id);
CREATE INDEX idx_click_events_contact ON public.newsletter_click_events(contact_id);

-- Aggregated topic pipeline impact table
CREATE TABLE public.newsletter_topic_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  topic text NOT NULL,
  issues_count int NOT NULL DEFAULT 0,
  total_sent int NOT NULL DEFAULT 0,
  total_opened int NOT NULL DEFAULT 0,
  total_clicked int NOT NULL DEFAULT 0,
  total_replied int NOT NULL DEFAULT 0,
  leads_generated int NOT NULL DEFAULT 0,
  deals_generated int NOT NULL DEFAULT 0,
  pipeline_value numeric NOT NULL DEFAULT 0,
  closed_revenue numeric NOT NULL DEFAULT 0,
  avg_open_rate numeric NOT NULL DEFAULT 0,
  avg_click_rate numeric NOT NULL DEFAULT 0,
  revenue_per_send numeric NOT NULL DEFAULT 0,
  pipeline_per_send numeric NOT NULL DEFAULT 0,
  last_calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, topic)
);
ALTER TABLE public.newsletter_topic_pipeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage topic_pipeline"
  ON public.newsletter_topic_pipeline FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- DB function to recalculate topic pipeline impact
CREATE OR REPLACE FUNCTION public.recalculate_topic_pipeline(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO newsletter_topic_pipeline (
    workspace_id, topic, issues_count, total_sent, total_opened, total_clicked,
    total_replied, leads_generated, deals_generated, pipeline_value, closed_revenue,
    avg_open_rate, avg_click_rate, revenue_per_send, pipeline_per_send, last_calculated_at
  )
  SELECT
    p_workspace_id,
    unnest(ni.topic_tags) AS topic,
    COUNT(DISTINCT ni.id),
    COALESCE(SUM(ni.sent_count), 0),
    COALESCE(SUM(ni.opened_count), 0),
    COALESCE(SUM(ni.clicked_count), 0),
    COALESCE(SUM(ni.replied_count), 0),
    COALESCE(SUM(ni.conversion_to_lead), 0),
    COALESCE(SUM(ni.conversion_to_deal), 0),
    0, 0,
    CASE WHEN SUM(ni.sent_count) > 0 THEN ROUND(SUM(ni.opened_count)::numeric / SUM(ni.sent_count) * 100, 1) ELSE 0 END,
    CASE WHEN SUM(ni.sent_count) > 0 THEN ROUND(SUM(ni.clicked_count)::numeric / SUM(ni.sent_count) * 100, 1) ELSE 0 END,
    0, 0, now()
  FROM newsletter_issues ni
  WHERE ni.workspace_id = p_workspace_id
    AND ni.topic_tags IS NOT NULL
    AND array_length(ni.topic_tags, 1) > 0
  GROUP BY unnest(ni.topic_tags)
  ON CONFLICT (workspace_id, topic) DO UPDATE SET
    issues_count = EXCLUDED.issues_count,
    total_sent = EXCLUDED.total_sent,
    total_opened = EXCLUDED.total_opened,
    total_clicked = EXCLUDED.total_clicked,
    total_replied = EXCLUDED.total_replied,
    leads_generated = EXCLUDED.leads_generated,
    deals_generated = EXCLUDED.deals_generated,
    avg_open_rate = EXCLUDED.avg_open_rate,
    avg_click_rate = EXCLUDED.avg_click_rate,
    last_calculated_at = now();

  UPDATE newsletter_topic_pipeline ntp
  SET
    pipeline_value = sub.pipeline_val,
    closed_revenue = sub.closed_rev,
    revenue_per_send = CASE WHEN ntp.total_sent > 0 THEN ROUND(sub.closed_rev / ntp.total_sent, 2) ELSE 0 END,
    pipeline_per_send = CASE WHEN ntp.total_sent > 0 THEN ROUND(sub.pipeline_val / ntp.total_sent, 2) ELSE 0 END
  FROM (
    SELECT
      t.topic,
      COALESCE(SUM(CASE WHEN d.stage NOT IN ('closed_won', 'closed_lost') THEN d.value ELSE 0 END), 0) AS pipeline_val,
      COALESCE(SUM(CASE WHEN d.stage = 'closed_won' THEN d.value ELSE 0 END), 0) AS closed_rev
    FROM newsletter_topic_pipeline t
    JOIN newsletter_issues ni ON ni.workspace_id = p_workspace_id
      AND t.topic = ANY(ni.topic_tags)
    JOIN newsletter_click_events nce ON nce.issue_id = ni.id AND nce.deal_id IS NOT NULL
    JOIN deals d ON d.id = nce.deal_id AND d.deleted_at IS NULL
    WHERE t.workspace_id = p_workspace_id
    GROUP BY t.topic
  ) sub
  WHERE ntp.workspace_id = p_workspace_id AND ntp.topic = sub.topic;
END;
$$;
