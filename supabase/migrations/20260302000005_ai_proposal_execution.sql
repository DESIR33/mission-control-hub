-- Feature 5: AI Auto-Execute Pipeline
ALTER TABLE ai_proposals ADD COLUMN IF NOT EXISTS execution_status TEXT DEFAULT 'none' CHECK (execution_status IN ('none','pending','executing','completed','failed'));
ALTER TABLE ai_proposals ADD COLUMN IF NOT EXISTS execution_result JSONB;
ALTER TABLE ai_proposals ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ;
