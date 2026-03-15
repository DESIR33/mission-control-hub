
-- Remove old twice-monthly YouTube cron jobs
SELECT cron.unschedule(1);
SELECT cron.unschedule(2);

-- Create daily youtube-sync at 6:00 AM UTC (midnight CST)
SELECT cron.schedule(
  'youtube-sync-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xoucztvrwwixujgwmbzm.supabase.co/functions/v1/youtube-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdWN6dHZyd3dpeHVqZ3dtYnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjg0MzEsImV4cCI6MjA4NzYwNDQzMX0.nhFGDmFrS6HZ3hwarllezA-xClDSyr-LEj3hRodScXI"}'::jsonb,
    body := '{"workspace_id": "ea11b24d-27bd-4488-9760-2663bc788e04"}'::jsonb
  ) AS request_id;
  $$
);

-- Create daily youtube-analytics-sync at 6:05 AM UTC
SELECT cron.schedule(
  'youtube-analytics-sync-daily',
  '5 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xoucztvrwwixujgwmbzm.supabase.co/functions/v1/youtube-analytics-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdWN6dHZyd3dpeHVqZ3dtYnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjg0MzEsImV4cCI6MjA4NzYwNDQzMX0.nhFGDmFrS6HZ3hwarllezA-xClDSyr-LEj3hRodScXI"}'::jsonb,
    body := '{"workspace_id": "ea11b24d-27bd-4488-9760-2663bc788e04"}'::jsonb
  ) AS request_id;
  $$
);
