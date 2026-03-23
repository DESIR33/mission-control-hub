-- Fix 4: Covering index for delta detection (index-only scans)
DROP INDEX IF EXISTS idx_inbox_emails_workspace_folder;
CREATE INDEX idx_inbox_emails_workspace_folder_covering
  ON public.inbox_emails (workspace_id, folder)
  INCLUDE (id, message_id, is_read);

-- Fix 5: Purge existing bloat from cron.job_run_details
DELETE FROM cron.job_run_details
WHERE end_time < now() - interval '7 days';

-- Fix 5: Add hourly cleanup job (7-day retention)
SELECT cron.schedule(
  'purge-cron-job-run-details',
  '15 * * * *',
  $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days'$$
);

-- Fix 6: Reschedule outlook-sync from 3min to 5min via cron.schedule (re-create)
SELECT cron.unschedule(8);

SELECT cron.schedule(
  'outlook-sync-every-5min',
  '*/5 * * * *',
  $$SELECT net.http_post(
    url := 'https://xoucztvrwwixujgwmbzm.supabase.co/functions/v1/outlook-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdWN6dHZyd3dpeHVqZ3dtYnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjg0MzEsImV4cCI6MjA4NzYwNDQzMX0.nhFGDmFrS6HZ3hwarllezA-xClDSyr-LEj3hRodScXI"}'::jsonb,
    body := '{"workspace_id": "ea11b24d-27bd-4488-9760-2663bc788e04", "sync_all_folders": true}'::jsonb
  ) AS request_id$$
);