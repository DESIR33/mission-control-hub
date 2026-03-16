-- Optimization #3: Composite indexes for hot query paths

-- Channel analytics: filtered by workspace_id, ordered by date
CREATE INDEX IF NOT EXISTS idx_yt_channel_analytics_ws_date 
ON youtube_channel_analytics (workspace_id, date DESC);

-- Video analytics: filtered by workspace_id, ordered by views
CREATE INDEX IF NOT EXISTS idx_yt_video_analytics_ws_views 
ON youtube_video_analytics (workspace_id, views DESC);

-- Video analytics: filtered by workspace_id + date range
CREATE INDEX IF NOT EXISTS idx_yt_video_analytics_ws_date 
ON youtube_video_analytics (workspace_id, date DESC);

-- Agent executions: filtered by workspace_id, ordered by created_at
CREATE INDEX IF NOT EXISTS idx_agent_executions_ws_created 
ON agent_executions (workspace_id, created_at DESC);

-- AI proposals: filtered by workspace_id + status
CREATE INDEX IF NOT EXISTS idx_ai_proposals_ws_status 
ON ai_proposals (workspace_id, status);

-- Contacts: filtered by workspace_id + deleted_at, ordered by updated_at
CREATE INDEX IF NOT EXISTS idx_contacts_ws_active 
ON contacts (workspace_id, updated_at DESC) WHERE deleted_at IS NULL;

-- Deals: filtered by workspace_id + deleted_at, ordered by updated_at
CREATE INDEX IF NOT EXISTS idx_deals_ws_active 
ON deals (workspace_id, updated_at DESC) WHERE deleted_at IS NULL;

-- Deals: filtered by stage for pipeline queries
CREATE INDEX IF NOT EXISTS idx_deals_ws_stage 
ON deals (workspace_id, stage) WHERE deleted_at IS NULL;

-- Activities: filtered by entity
CREATE INDEX IF NOT EXISTS idx_activities_entity 
ON activities (workspace_id, entity_id, entity_type, performed_at DESC);

-- Subscribers: active list
CREATE INDEX IF NOT EXISTS idx_subscribers_ws_active 
ON subscribers (workspace_id, updated_at DESC) WHERE deleted_at IS NULL;