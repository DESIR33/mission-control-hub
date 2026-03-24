
-- Enable pg_cron and pg_net if not already
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a function that triggers beehiiv sync for all workspaces with beehiiv enabled
CREATE OR REPLACE FUNCTION public.trigger_beehiiv_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ws_rec RECORD;
BEGIN
  FOR ws_rec IN
    SELECT workspace_id
    FROM workspace_integrations
    WHERE integration_key = 'beehiiv'
      AND enabled = true
  LOOP
    PERFORM net.http_post(
      url := 'https://xoucztvrwwixujgwmbzm.supabase.co/functions/v1/beehiiv-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdWN6dHZyd3dpeHVqZ3dtYnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjg0MzEsImV4cCI6MjA4NzYwNDQzMX0.nhFGDmFrS6HZ3hwarllezA-xClDSyr-LEj3hRodScXI'
      ),
      body := jsonb_build_object('workspace_id', ws_rec.workspace_id)
    );
  END LOOP;
END;
$$;

-- Schedule daily at 04:00 UTC (22:00 CST)
SELECT cron.schedule(
  'beehiiv-daily-sync',
  '0 4 * * *',
  $$SELECT public.trigger_beehiiv_sync()$$
);
