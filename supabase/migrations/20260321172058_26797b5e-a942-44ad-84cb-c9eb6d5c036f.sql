
-- Add RLS policies to partition child tables
-- (Postgres 11+ propagates parent policies to partitions, but the linter wants explicit policies)

-- youtube_channel_analytics partitions
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'yt_chan_analytics_archive',
    'yt_chan_analytics_2026',
    'yt_chan_analytics_2027',
    'yt_chan_analytics_default',
    'yt_sync_logs_archive',
    'yt_sync_logs_2026',
    'yt_sync_logs_2027',
    'yt_sync_logs_default',
    'yt_comments_archive',
    'yt_comments_2026',
    'yt_comments_2027',
    'yt_comments_default'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
