-- Feature 1: Smart Outreach Email Engine - Send log for email deliveries
CREATE TABLE IF NOT EXISTS sequence_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  enrollment_id UUID NOT NULL,
  sequence_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  step_number INT NOT NULL,
  subject TEXT NOT NULL,
  to_email TEXT NOT NULL,
  resend_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','delivered','opened','bounced','failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_send_log_workspace ON sequence_send_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_send_log_enrollment ON sequence_send_log(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_send_log_sequence ON sequence_send_log(sequence_id);

ALTER TABLE sequence_send_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sequence_send_log' AND policyname = 'sequence_send_log_select') THEN
    CREATE POLICY sequence_send_log_select ON sequence_send_log FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sequence_send_log' AND policyname = 'sequence_send_log_insert') THEN
    CREATE POLICY sequence_send_log_insert ON sequence_send_log FOR INSERT WITH CHECK (true);
  END IF;
END $$;
