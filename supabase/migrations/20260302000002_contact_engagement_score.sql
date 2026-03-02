-- Feature 10: Contact Engagement Scoring
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS engagement_score INT DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contacts_engagement') THEN
    CREATE INDEX idx_contacts_engagement ON contacts(workspace_id, engagement_score DESC);
  END IF;
END $$;
