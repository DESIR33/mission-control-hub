
-- Schedule daily briefing at 4am CST (10:00 UTC)
SELECT cron.schedule(
  'daily-briefing-4am-cst',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xoucztvrwwixujgwmbzm.supabase.co/functions/v1/daily-briefing',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdWN6dHZyd3dpeHVqZ3dtYnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjg0MzEsImV4cCI6MjA4NzYwNDQzMX0.nhFGDmFrS6HZ3hwarllezA-xClDSyr-LEj3hRodScXI"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
