
-- Activities: frequently queried by entity
CREATE INDEX IF NOT EXISTS idx_activities_entity
  ON activities (workspace_id, entity_type, entity_id);

-- Activities: workspace + time ordering
CREATE INDEX IF NOT EXISTS idx_activities_workspace_time
  ON activities (workspace_id, performed_at DESC);

-- Deals: stage + close date filtering for pipeline queries
CREATE INDEX IF NOT EXISTS idx_deals_pipeline
  ON deals (workspace_id, stage, expected_close_date)
  WHERE deleted_at IS NULL;

-- Contacts: last_contact_date for stale contact queries
CREATE INDEX IF NOT EXISTS idx_contacts_last_contact
  ON contacts (workspace_id, last_contact_date)
  WHERE deleted_at IS NULL AND last_contact_date IS NOT NULL;

-- Contacts: status for count queries
CREATE INDEX IF NOT EXISTS idx_contacts_status
  ON contacts (workspace_id, status)
  WHERE deleted_at IS NULL;

-- AI Proposals: status filtering
CREATE INDEX IF NOT EXISTS idx_ai_proposals_status
  ON ai_proposals (workspace_id, status);

-- Video queue: status for count queries
CREATE INDEX IF NOT EXISTS idx_video_queue_status
  ON video_queue (workspace_id, status);

-- Agent executions: workspace + time for polling
CREATE INDEX IF NOT EXISTS idx_agent_executions_workspace_time
  ON agent_executions (workspace_id, created_at DESC);

-- YouTube channel analytics: workspace + date for revenue queries
CREATE INDEX IF NOT EXISTS idx_yt_channel_analytics_date
  ON youtube_channel_analytics (workspace_id, date);

-- YouTube video analytics: workspace + date
CREATE INDEX IF NOT EXISTS idx_yt_video_analytics_date
  ON youtube_video_analytics (workspace_id, date);
