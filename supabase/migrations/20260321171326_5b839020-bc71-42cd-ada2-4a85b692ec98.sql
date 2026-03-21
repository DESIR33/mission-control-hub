
-- Composite indexes for high-traffic query patterns

-- contacts
CREATE INDEX IF NOT EXISTS idx_contacts_ws_deleted ON public.contacts (workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_ws_status ON public.contacts (workspace_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_ws_last_contact ON public.contacts (workspace_id, last_contact_date) WHERE deleted_at IS NULL AND last_contact_date IS NOT NULL;

-- deals
CREATE INDEX IF NOT EXISTS idx_deals_ws_stage ON public.deals (workspace_id, stage) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deals_ws_stage_close ON public.deals (workspace_id, stage, expected_close_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deals_ws_closed_won ON public.deals (workspace_id) WHERE deleted_at IS NULL AND stage = 'closed_won';

-- ai_proposals
CREATE INDEX IF NOT EXISTS idx_ai_proposals_ws_status ON public.ai_proposals (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_proposals_ws_pending ON public.ai_proposals (workspace_id) WHERE status = 'pending';

-- video_queue
CREATE INDEX IF NOT EXISTS idx_video_queue_ws_status ON public.video_queue (workspace_id, status);

-- youtube_video_stats
CREATE INDEX IF NOT EXISTS idx_yt_video_stats_ws_views ON public.youtube_video_stats (workspace_id, views DESC);

-- youtube_channel_stats
CREATE INDEX IF NOT EXISTS idx_yt_channel_stats_ws_fetched ON public.youtube_channel_stats (workspace_id, fetched_at DESC);

-- youtube_video_analytics
CREATE INDEX IF NOT EXISTS idx_yt_video_analytics_ws_date ON public.youtube_video_analytics (workspace_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_yt_video_analytics_ws_vid_date ON public.youtube_video_analytics (workspace_id, youtube_video_id, date DESC);

-- youtube_channel_analytics
CREATE INDEX IF NOT EXISTS idx_yt_channel_analytics_ws_date ON public.youtube_channel_analytics (workspace_id, date DESC);

-- assistant_daily_logs
CREATE INDEX IF NOT EXISTS idx_assistant_daily_logs_ws_source_date ON public.assistant_daily_logs (workspace_id, source, log_date DESC);

-- assistant_memory
CREATE INDEX IF NOT EXISTS idx_assistant_memory_ws_origin ON public.assistant_memory (workspace_id, origin);

-- agent_executions
CREATE INDEX IF NOT EXISTS idx_agent_executions_ws_slug_created ON public.agent_executions (workspace_id, agent_slug, created_at DESC);

-- agent_definitions
CREATE INDEX IF NOT EXISTS idx_agent_definitions_slug_ws ON public.agent_definitions (slug, workspace_id) WHERE enabled = true;

-- growth_goals
CREATE INDEX IF NOT EXISTS idx_growth_goals_ws_status ON public.growth_goals (workspace_id, status);

-- affiliate_transactions
CREATE INDEX IF NOT EXISTS idx_affiliate_tx_ws_date ON public.affiliate_transactions (workspace_id, transaction_date);

-- revenue_transactions
CREATE INDEX IF NOT EXISTS idx_revenue_tx_ws_created ON public.revenue_transactions (workspace_id, created_at DESC);

-- dataset_sync_status
CREATE INDEX IF NOT EXISTS idx_dataset_sync_ws_key ON public.dataset_sync_status (workspace_id, dataset_key);

-- webhook_sync_queue
CREATE INDEX IF NOT EXISTS idx_webhook_sync_queue_ws_status ON public.webhook_sync_queue (workspace_id, status);

-- video_optimization_experiments
CREATE INDEX IF NOT EXISTS idx_video_experiments_ws_status_created ON public.video_optimization_experiments (workspace_id, status, created_at DESC);

-- competitor_channels
CREATE INDEX IF NOT EXISTS idx_competitor_channels_ws ON public.competitor_channels (workspace_id);
