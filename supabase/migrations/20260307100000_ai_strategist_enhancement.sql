-- ============================================================
-- AI Strategist Enhancement: Video Optimization System
-- Daily recommendations, experiment tracking, auto-rollback
-- ============================================================

-- 1. Video Optimization Experiments
-- Tracks before/after state for every approved optimization
CREATE TABLE IF NOT EXISTS public.video_optimization_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  video_title TEXT NOT NULL,
  experiment_type TEXT NOT NULL CHECK (experiment_type IN ('title', 'description', 'tags', 'thumbnail', 'multi')),

  -- Before state (snapshot at change time)
  original_title TEXT,
  original_description TEXT,
  original_tags TEXT[],
  original_thumbnail_url TEXT,

  -- After state
  new_title TEXT,
  new_description TEXT,
  new_tags TEXT[],
  new_thumbnail_url TEXT,

  -- Metrics before (30-day snapshot at change time)
  baseline_views INTEGER,
  baseline_ctr NUMERIC,
  baseline_impressions INTEGER,
  baseline_avg_view_duration INTEGER,
  baseline_watch_time_hours NUMERIC,

  -- Metrics after (populated by daily check)
  result_views INTEGER,
  result_ctr NUMERIC,
  result_impressions INTEGER,
  result_avg_view_duration INTEGER,
  result_watch_time_hours NUMERIC,

  -- Experiment lifecycle
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'rolled_back')),
  proposal_id UUID REFERENCES public.ai_proposals(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  measurement_period_days INTEGER NOT NULL DEFAULT 14,
  measured_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  rollback_reason TEXT,

  -- Learning
  performance_delta JSONB,
  lesson_learned TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experiments_workspace ON public.video_optimization_experiments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_experiments_video ON public.video_optimization_experiments(video_id);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON public.video_optimization_experiments(workspace_id, status);

ALTER TABLE public.video_optimization_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view experiments"
  ON public.video_optimization_experiments FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert experiments"
  ON public.video_optimization_experiments FOR INSERT TO authenticated
  WITH CHECK (public.get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));

CREATE POLICY "Operators+ can update experiments"
  ON public.video_optimization_experiments FOR UPDATE TO authenticated
  USING (public.get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));

CREATE POLICY "Admins can delete experiments"
  ON public.video_optimization_experiments FOR DELETE TO authenticated
  USING (public.get_workspace_role(workspace_id) = 'admin');

CREATE TRIGGER update_experiments_updated_at
  BEFORE UPDATE ON public.video_optimization_experiments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Strategist Daily Runs
-- Logs each daily strategist execution and its recommendations
CREATE TABLE IF NOT EXISTS public.strategist_daily_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  execution_id UUID REFERENCES public.agent_executions(id),
  recommendations_count INTEGER DEFAULT 0,
  proposal_ids UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, run_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_runs_workspace ON public.strategist_daily_runs(workspace_id);

ALTER TABLE public.strategist_daily_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view daily_runs"
  ON public.strategist_daily_runs FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert daily_runs"
  ON public.strategist_daily_runs FOR INSERT TO authenticated
  WITH CHECK (public.get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));

CREATE POLICY "Operators+ can update daily_runs"
  ON public.strategist_daily_runs FOR UPDATE TO authenticated
  USING (public.get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));

-- 3. Strategist Notifications
CREATE TABLE IF NOT EXISTS public.strategist_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.strategist_daily_runs(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strat_notif_workspace ON public.strategist_notifications(workspace_id, read);

ALTER TABLE public.strategist_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view strategist_notifications"
  ON public.strategist_notifications FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update strategist_notifications"
  ON public.strategist_notifications FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert strategist_notifications"
  ON public.strategist_notifications FOR INSERT TO authenticated
  WITH CHECK (public.get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));

-- 4. Extend ai_proposals for video optimization
-- Drop old constraint and add new one with video optimization types
ALTER TABLE public.ai_proposals
  DROP CONSTRAINT IF EXISTS ai_proposals_proposal_type_check;

ALTER TABLE public.ai_proposals
  ADD CONSTRAINT ai_proposals_proposal_type_check
  CHECK (proposal_type IN (
    'enrichment', 'outreach', 'deal_update', 'score_update',
    'tag_suggestion', 'content_suggestion',
    'video_title_optimization', 'video_description_optimization',
    'video_tags_optimization', 'video_thumbnail_optimization'
  ));

-- Extend entity_type to support video
ALTER TABLE public.ai_proposals
  DROP CONSTRAINT IF EXISTS ai_proposals_entity_type_check;

ALTER TABLE public.ai_proposals
  ADD CONSTRAINT ai_proposals_entity_type_check
  CHECK (entity_type IN ('contact', 'deal', 'company', 'video'));

-- Add video optimization columns
ALTER TABLE public.ai_proposals ADD COLUMN IF NOT EXISTS video_id TEXT;
ALTER TABLE public.ai_proposals ADD COLUMN IF NOT EXISTS optimization_proof JSONB;
ALTER TABLE public.ai_proposals ADD COLUMN IF NOT EXISTS thumbnail_prompts TEXT[];
ALTER TABLE public.ai_proposals ADD COLUMN IF NOT EXISTS thumbnail_urls TEXT[];
ALTER TABLE public.ai_proposals ADD COLUMN IF NOT EXISTS requires_thumbnail_generation BOOLEAN DEFAULT false;

-- 5. pg_cron schedules
-- Daily video strategist at 3:00 AM CST (9:00 UTC)
SELECT cron.schedule(
  'daily-video-strategist',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/strategist-daily-run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{"source": "pg_cron"}'::jsonb
  );
  $$
);

-- Experiment metric checker at 9:00 AM CST (15:00 UTC)
SELECT cron.schedule(
  'check-experiment-metrics',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/strategist-check-experiments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{"source": "pg_cron"}'::jsonb
  );
  $$
);

-- 6. Update content-strategist agent definition with new capabilities
UPDATE public.agent_definitions
SET
  system_prompt = system_prompt || E'\n\nADDITIONAL CAPABILITY - VIDEO OPTIMIZATION:\nYou can also optimize existing videos. When running the daily optimization audit, use query_all_video_analytics to fetch all video metrics, rank videos by 30-day performance into quartiles, and generate exactly 4 data-driven recommendations. Each recommendation must include specific metrics, percentile ranking, competitor comparisons, and YouTube best practices as proof. Use query_experiments to learn from past optimization results. Always save insights about what worked to memory.',
  config = config || '{"optimization_schedule": "daily", "optimization_tables": ["youtube_video_stats", "youtube_video_analytics", "video_optimization_experiments"]}'::jsonb,
  updated_at = now()
WHERE slug = 'content-strategist' AND is_system = true;
