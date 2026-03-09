
SELECT cron.schedule(
  'x-list-scan-daily-5am-cst',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xoucztvrwwixujgwmbzm.supabase.co/functions/v1/x-list-scanner',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdWN6dHZyd3dpeHVqZ3dtYnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjg0MzEsImV4cCI6MjA4NzYwNDQzMX0.nhFGDmFrS6HZ3hwarllezA-xClDSyr-LEj3hRodScXI"}'::jsonb,
    body := '{"workspace_id": "ea11b24d-27bd-4488-9760-2663bc788e04"}'::jsonb
  ) AS request_id;
  $$
);
