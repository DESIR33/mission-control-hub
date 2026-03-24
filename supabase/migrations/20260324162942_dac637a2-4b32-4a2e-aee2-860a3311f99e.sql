-- Drop the partial indexes that don't work with ON CONFLICT
DROP INDEX IF EXISTS idx_subscribers_workspace_beehiiv_id;
DROP INDEX IF EXISTS idx_newsletter_issues_workspace_beehiiv_post_id;

-- Create regular unique indexes (NULLs are treated as distinct in PG, so multiple NULL beehiiv_id rows are fine)
CREATE UNIQUE INDEX idx_subscribers_workspace_beehiiv_id
  ON subscribers (workspace_id, beehiiv_id);

CREATE UNIQUE INDEX idx_newsletter_issues_workspace_beehiiv_post_id
  ON newsletter_issues (workspace_id, beehiiv_post_id);