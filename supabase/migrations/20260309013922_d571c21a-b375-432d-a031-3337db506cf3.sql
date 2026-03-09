-- Add snoozed_until for Snooze/Remind Me feature
ALTER TABLE inbox_emails ADD COLUMN IF NOT EXISTS snoozed_until timestamptz DEFAULT NULL;

-- Add scheduled send columns
ALTER TABLE inbox_emails ADD COLUMN IF NOT EXISTS scheduled_send_at timestamptz DEFAULT NULL;
ALTER TABLE inbox_emails ADD COLUMN IF NOT EXISTS send_status text DEFAULT NULL;

-- Add read tracking columns for sent emails
ALTER TABLE inbox_emails ADD COLUMN IF NOT EXISTS tracking_pixel_id text DEFAULT NULL;
ALTER TABLE inbox_emails ADD COLUMN IF NOT EXISTS opened_at timestamptz DEFAULT NULL;
ALTER TABLE inbox_emails ADD COLUMN IF NOT EXISTS open_count integer DEFAULT 0;

-- Index for snooze queries (find emails to un-snooze)
CREATE INDEX IF NOT EXISTS idx_inbox_emails_snoozed ON inbox_emails (workspace_id, snoozed_until) WHERE snoozed_until IS NOT NULL;

-- Index for scheduled send
CREATE INDEX IF NOT EXISTS idx_inbox_emails_scheduled ON inbox_emails (workspace_id, scheduled_send_at) WHERE scheduled_send_at IS NOT NULL AND send_status = 'scheduled';