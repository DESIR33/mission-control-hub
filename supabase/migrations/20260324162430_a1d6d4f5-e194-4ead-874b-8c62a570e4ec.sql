-- Add unique constraint for beehiiv subscriber upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_workspace_beehiiv_id
  ON subscribers (workspace_id, beehiiv_id)
  WHERE beehiiv_id IS NOT NULL;

-- Add unique constraint for beehiiv post upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_issues_workspace_beehiiv_post_id
  ON newsletter_issues (workspace_id, beehiiv_post_id)
  WHERE beehiiv_post_id IS NOT NULL;