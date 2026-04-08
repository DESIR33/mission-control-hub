
-- Create trigger function for beehiiv post sync
CREATE OR REPLACE FUNCTION public.trigger_beehiiv_post_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://xoucztvrwwixujgwmbzm.supabase.co/functions/v1/beehiiv-post-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdWN6dHZyd3dpeHVqZ3dtYnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjg0MzEsImV4cCI6MjA4NzYwNDQzMX0.nhFGDmFrS6HZ3hwarllezA-xClDSyr-LEj3hRodScXI'
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Schedule daily at 6:00 AM UTC
SELECT cron.schedule(
  'beehiiv-post-sync-daily',
  '0 6 * * *',
  'SELECT public.trigger_beehiiv_post_sync()'
);
