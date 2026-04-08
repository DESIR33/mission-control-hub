
-- Add missing columns to newsletter_issues for detailed Beehiiv stats
ALTER TABLE public.newsletter_issues
  ADD COLUMN IF NOT EXISTS beehiiv_status TEXT,
  ADD COLUMN IF NOT EXISTS beehiiv_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS beehiiv_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS beehiiv_last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS beehiiv_sync_error TEXT,
  ADD COLUMN IF NOT EXISTS email_delivered_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_delivery_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_open_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_click_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_click_rate_verified NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_unique_clicks_raw INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_total_clicks_raw INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_unique_clicks_verified INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_total_clicks_verified INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_bounce_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_soft_bounced INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_hard_bounced INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_unsubscribe_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_spam_reported INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_suppressions INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS web_view_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS web_click_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS web_unique_click_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS web_upgrades INT DEFAULT 0;

-- Create beehiiv_post_link_clicks table
CREATE TABLE IF NOT EXISTS public.beehiiv_post_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  beehiiv_post_id TEXT NOT NULL,
  newsletter_issue_id UUID REFERENCES public.newsletter_issues(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  total_clicks INT DEFAULT 0,
  unique_clicks INT DEFAULT 0,
  total_unique_clicks INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, beehiiv_post_id, url)
);

ALTER TABLE public.beehiiv_post_link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view link clicks"
  ON public.beehiiv_post_link_clicks FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can manage link clicks"
  ON public.beehiiv_post_link_clicks FOR ALL
  TO authenticated
  USING (public.is_workspace_member(workspace_id));
