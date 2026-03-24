
-- Add beehiiv_id to subscribers for deduplication during sync
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS beehiiv_id text DEFAULT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_beehiiv_id ON public.subscribers (workspace_id, beehiiv_id) WHERE beehiiv_id IS NOT NULL;

-- Add beehiiv-specific engagement fields to subscribers
ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS beehiiv_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS beehiiv_tier text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS utm_source text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS utm_medium text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS utm_campaign text DEFAULT NULL;

-- Add beehiiv_post_id to newsletter_issues for linking
ALTER TABLE public.newsletter_issues
  ADD COLUMN IF NOT EXISTS beehiiv_post_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS preview_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS web_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS audience text DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS publish_date timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_sent_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_open_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_click_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_unique_open_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_unique_click_count integer DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_issues_beehiiv_post_id ON public.newsletter_issues (workspace_id, beehiiv_post_id) WHERE beehiiv_post_id IS NOT NULL;

-- Track last sync time
ALTER TABLE public.workspace_integrations
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_sync_error text DEFAULT NULL;
