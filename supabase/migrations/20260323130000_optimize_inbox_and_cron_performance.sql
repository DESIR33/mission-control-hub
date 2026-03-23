-- Performance optimization migration
-- Addresses top query bottlenecks identified via pg_stat_statements

-- ============================================================
-- 1. inbox_emails: reduce upsert cost (61.8% of total DB time)
-- ============================================================

-- Covering index for the frequent SELECT id, message_id, is_read query
-- used by outlook-sync delta detection (700 calls, currently 56ms avg)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inbox_emails_workspace_folder_covering
  ON public.inbox_emails (workspace_id, folder)
  INCLUDE (id, message_id, is_read);

-- Drop the old non-covering index (now redundant)
DROP INDEX IF EXISTS idx_inbox_emails_workspace_folder;

-- ============================================================
-- 2. Cron job_run_details bloat (15.8% of total DB time)
--    215 calls averaging 1,053ms, max 118,743ms
--    The table accumulates forever and updates become slow.
-- ============================================================

-- Purge old cron run history (keep last 7 days)
DELETE FROM cron.job_run_details
WHERE end_time < now() - interval '7 days';

-- Schedule automatic cleanup of cron.job_run_details every hour
SELECT cron.schedule(
  'cleanup-cron-job-run-details',
  '0 * * * *',
  $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days'$$
);

-- ============================================================
-- 3. Reduce outlook-sync frequency from every 3min to every 5min
--    The sync fetches ALL messages per folder, does full upsert,
--    and runs delta deletes. 3min is too aggressive and causes
--    overlapping runs + 1,351 upsert calls in a short window.
-- ============================================================

-- Remove the old 3-minute schedule
SELECT cron.unschedule('outlook-sync-every-3min');

-- Re-create at 5-minute interval
SELECT cron.schedule(
  'outlook-sync-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/outlook-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"workspace_id": "ea11b24d-27bd-4488-9760-2663bc788e04", "sync_all_folders": true}'::jsonb
  ) AS request_id;
  $$
);
