-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  Sync Log, Milestones, Content Predictions, Sequence Health       ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ── 1. Sync Log – track every sync operation with details ───────────
CREATE TABLE IF NOT EXISTS public.youtube_sync_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sync_type     TEXT NOT NULL DEFAULT 'analytics',
  status        TEXT NOT NULL DEFAULT 'started',
  records_synced INTEGER DEFAULT 0,
  duration_ms   INTEGER,
  error_message TEXT,
  details       JSONB DEFAULT '{}',
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sync_log_workspace ON public.youtube_sync_log(workspace_id);
CREATE INDEX idx_sync_log_started ON public.youtube_sync_log(started_at DESC);
ALTER TABLE public.youtube_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_sync_log" ON public.youtube_sync_log FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

-- ── 2. Growth Milestones – explicit milestone targets ───────────────
CREATE TABLE IF NOT EXISTS public.growth_milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  target_subs   INTEGER NOT NULL,
  target_date   DATE,
  reached_at    TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','on_track','at_risk','reached')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_milestones_workspace ON public.growth_milestones(workspace_id);
ALTER TABLE public.growth_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_milestones" ON public.growth_milestones FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

-- ── 3. Content Predictions – track title/thumbnail A/B predictions ──
CREATE TABLE IF NOT EXISTS public.content_predictions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  video_queue_id  INTEGER REFERENCES public.video_queue(id) ON DELETE SET NULL,
  youtube_video_id TEXT,
  title_options   JSONB NOT NULL DEFAULT '[]',
  thumbnail_options JSONB DEFAULT '[]',
  predicted_ctr   NUMERIC(5,2),
  predicted_views INTEGER,
  actual_ctr      NUMERIC(5,2),
  actual_views    INTEGER,
  chosen_title    TEXT,
  ai_reasoning    TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','measured')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  measured_at     TIMESTAMPTZ
);
CREATE INDEX idx_predictions_workspace ON public.content_predictions(workspace_id);
ALTER TABLE public.content_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_predictions" ON public.content_predictions FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

-- ── 4. Sequence step events for health tracking ─────────────────────
CREATE TABLE IF NOT EXISTS public.sequence_step_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL,
  step_number   INTEGER NOT NULL,
  event_type    TEXT NOT NULL CHECK (event_type IN ('sent','delivered','opened','clicked','replied','bounced','unsubscribed')),
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata      JSONB DEFAULT '{}'
);
CREATE INDEX idx_step_events_workspace ON public.sequence_step_events(workspace_id);
CREATE INDEX idx_step_events_enrollment ON public.sequence_step_events(enrollment_id);
ALTER TABLE public.sequence_step_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_step_events" ON public.sequence_step_events FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

-- ── 5. Competitor Activity Feed ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.competitor_activity (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  competitor_id   UUID NOT NULL REFERENCES public.competitor_channels(id) ON DELETE CASCADE,
  activity_type   TEXT NOT NULL CHECK (activity_type IN ('new_video','milestone','growth_spike','viral_video')),
  title           TEXT NOT NULL,
  description     TEXT,
  metadata        JSONB DEFAULT '{}',
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_competitor_activity_workspace ON public.competitor_activity(workspace_id);
CREATE INDEX idx_competitor_activity_detected ON public.competitor_activity(detected_at DESC);
ALTER TABLE public.competitor_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_competitor_activity" ON public.competitor_activity FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

-- ── 6. Media Kit snapshots ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.media_kit_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel_name    TEXT NOT NULL,
  subscriber_count INTEGER NOT NULL DEFAULT 0,
  avg_views       INTEGER NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0,
  demographics    JSONB DEFAULT '{}',
  top_videos      JSONB DEFAULT '[]',
  pricing_tiers   JSONB DEFAULT '[]',
  share_token     TEXT UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_media_kit_workspace ON public.media_kit_snapshots(workspace_id);
ALTER TABLE public.media_kit_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_media_kit" ON public.media_kit_snapshots FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
