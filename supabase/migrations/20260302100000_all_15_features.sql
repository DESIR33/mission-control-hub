-- ============================================================
-- Comprehensive migration for all 15 growth features
-- ============================================================

-- Feature 1: YouTube Analytics Sync Status
CREATE TABLE IF NOT EXISTS youtube_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  sync_type TEXT NOT NULL DEFAULT 'analytics',
  status TEXT NOT NULL DEFAULT 'idle',
  last_synced_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  error_message TEXT,
  records_synced INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, sync_type)
);

-- Feature 3: AI Content Suggestions
CREATE TABLE IF NOT EXISTS ai_content_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  title TEXT NOT NULL,
  description TEXT,
  predicted_views_low INTEGER,
  predicted_views_high INTEGER,
  confidence_score NUMERIC DEFAULT 0,
  reasoning TEXT,
  optimal_length_minutes INTEGER,
  best_publish_day TEXT,
  best_publish_time TEXT,
  status TEXT NOT NULL DEFAULT 'suggestion',
  video_queue_id UUID REFERENCES video_queue(id),
  actual_views INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Feature 4: YouTube Lead Comments
CREATE TABLE IF NOT EXISTS youtube_lead_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  comment_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  video_title TEXT,
  author_channel_id TEXT,
  author_name TEXT,
  author_avatar_url TEXT,
  author_subscriber_count INTEGER DEFAULT 0,
  comment_text TEXT NOT NULL,
  detected_intent TEXT NOT NULL DEFAULT 'other',
  processed BOOLEAN NOT NULL DEFAULT false,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  contact_id UUID REFERENCES contacts(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, comment_id)
);

-- Feature 7: Rate Cards
CREATE TABLE IF NOT EXISTS rate_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL DEFAULT 'Default Rate Card',
  subscriber_count INTEGER DEFAULT 0,
  avg_views INTEGER DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  demographics_summary JSONB DEFAULT '{}',
  pricing_tiers JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Feature 10: Competitor Channels
CREATE TABLE IF NOT EXISTS competitor_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  channel_url TEXT,
  subscriber_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  avg_views_per_video INTEGER DEFAULT 0,
  upload_frequency_days NUMERIC DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, channel_id)
);

CREATE TABLE IF NOT EXISTS competitor_stats_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES competitor_channels(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  subscriber_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(competitor_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS competitor_top_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES competitor_channels(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(competitor_id, video_id)
);

-- Feature 11: Email Sequence A/B Testing
ALTER TABLE email_sequences ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '{}';

-- Feature 13: Deal Stage History (for timeline)
CREATE TABLE IF NOT EXISTS deal_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now(),
  changed_by UUID
);

-- Feature 9: Contact Engagement Scores
CREATE TABLE IF NOT EXISTS contact_engagement_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  total_score INTEGER NOT NULL DEFAULT 0,
  email_score INTEGER DEFAULT 0,
  reply_score INTEGER DEFAULT 0,
  deal_score INTEGER DEFAULT 0,
  youtube_score INTEGER DEFAULT 0,
  recency_score INTEGER DEFAULT 0,
  previous_score INTEGER DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contact_id)
);

-- Feature 15: Bulk Import Jobs
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  enriched_rows INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  field_mapping JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Add enrichment_youtube column if not already present on contacts
-- (already exists in types but ensuring migration)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='enrichment_youtube') THEN
    ALTER TABLE contacts ADD COLUMN enrichment_youtube JSONB;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE youtube_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_content_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_lead_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_stats_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_top_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_engagement_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies (workspace-scoped access)
CREATE POLICY "workspace_youtube_sync_status" ON youtube_sync_status FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "workspace_ai_content_suggestions" ON ai_content_suggestions FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "workspace_youtube_lead_comments" ON youtube_lead_comments FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "workspace_rate_cards" ON rate_cards FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "workspace_competitor_channels" ON competitor_channels FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "workspace_competitor_stats_history" ON competitor_stats_history FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "workspace_competitor_top_videos" ON competitor_top_videos FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "workspace_deal_stage_history" ON deal_stage_history FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "workspace_contact_engagement_scores" ON contact_engagement_scores FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "workspace_import_jobs" ON import_jobs FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
