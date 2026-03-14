
SELECT cron.schedule(
  'weekly-sponsor-scan',
  '0 12 * * 1',
  $$
  SELECT
    net.http_post(
      url := 'https://xoucztvrwwixujgwmbzm.supabase.co/functions/v1/weekly-sponsor-scan',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdWN6dHZyd3dpeHVqZ3dtYnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjg0MzEsImV4cCI6MjA4NzYwNDQzMX0.nhFGDmFrS6HZ3hwarllezA-xClDSyr-LEj3hRodScXI"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
