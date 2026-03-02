-- Feature 2: YouTube Performance Alerts
CREATE TABLE IF NOT EXISTS youtube_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('views_spike','ctr_drop','sub_surge','engagement_anomaly','revenue_milestone')),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','celebration')),
  title TEXT NOT NULL,
  description TEXT,
  youtube_video_id TEXT,
  metric_name TEXT,
  metric_value NUMERIC,
  threshold_value NUMERIC,
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_youtube_alerts_workspace ON youtube_alerts(workspace_id, created_at DESC);

ALTER TABLE youtube_alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'youtube_alerts' AND policyname = 'youtube_alerts_select') THEN
    CREATE POLICY youtube_alerts_select ON youtube_alerts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'youtube_alerts' AND policyname = 'youtube_alerts_all') THEN
    CREATE POLICY youtube_alerts_all ON youtube_alerts FOR ALL USING (true);
  END IF;
END $$;
