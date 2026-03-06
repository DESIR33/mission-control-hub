
-- ══════════════════════════════════════════════════════════════
-- Agent Hub: agent_definitions, agent_skills, agent_executions
-- Strategist: video_optimization_experiments, strategist_daily_runs, strategist_notifications
-- ══════════════════════════════════════════════════════════════

-- 1. Agent Definitions
CREATE TABLE IF NOT EXISTS public.agent_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL DEFAULT '',
  system_prompt text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT 'anthropic/claude-sonnet-4-20250514',
  skills text[] NOT NULL DEFAULT '{}',
  config jsonb NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, slug)
);

ALTER TABLE public.agent_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view agent_definitions" ON public.agent_definitions
  FOR SELECT TO authenticated
  USING (workspace_id IS NULL OR is_workspace_member(workspace_id));

CREATE POLICY "Admins can manage agent_definitions" ON public.agent_definitions
  FOR ALL TO authenticated
  USING (get_workspace_role(workspace_id) = 'admin')
  WITH CHECK (get_workspace_role(workspace_id) = 'admin');

-- 2. Agent Skills
CREATE TABLE IF NOT EXISTS public.agent_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL DEFAULT '',
  input_schema jsonb NOT NULL DEFAULT '{}',
  skill_type text NOT NULL DEFAULT 'system' CHECK (skill_type IN ('system', 'custom')),
  tool_definitions jsonb NOT NULL DEFAULT '[]',
  handler_code text,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('competitor', 'content', 'growth', 'audience', 'revenue', 'general')),
  enabled boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, slug)
);

ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view agent_skills" ON public.agent_skills
  FOR SELECT TO authenticated
  USING (workspace_id IS NULL OR is_workspace_member(workspace_id));

CREATE POLICY "Admins can manage agent_skills" ON public.agent_skills
  FOR ALL TO authenticated
  USING (get_workspace_role(workspace_id) = 'admin')
  WITH CHECK (get_workspace_role(workspace_id) = 'admin');

-- 3. Agent Executions
CREATE TABLE IF NOT EXISTS public.agent_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agent_definitions(id) ON DELETE SET NULL,
  agent_slug text NOT NULL,
  skill_slug text,
  trigger_type text NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'scheduled', 'chat')),
  input jsonb NOT NULL DEFAULT '{}',
  output jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  proposals_created integer NOT NULL DEFAULT 0,
  duration_ms integer,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view agent_executions" ON public.agent_executions
  FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Service can insert agent_executions" ON public.agent_executions
  FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(workspace_id));

-- 4. Video Optimization Experiments
CREATE TABLE IF NOT EXISTS public.video_optimization_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  video_title text NOT NULL DEFAULT '',
  experiment_type text NOT NULL DEFAULT 'title' CHECK (experiment_type IN ('title', 'description', 'tags', 'thumbnail', 'multi')),
  original_title text,
  original_description text,
  original_tags text[],
  original_thumbnail_url text,
  new_title text,
  new_description text,
  new_tags text[],
  new_thumbnail_url text,
  baseline_views integer NOT NULL DEFAULT 0,
  baseline_ctr numeric NOT NULL DEFAULT 0,
  baseline_impressions integer NOT NULL DEFAULT 0,
  baseline_avg_view_duration integer NOT NULL DEFAULT 0,
  baseline_watch_time_hours numeric NOT NULL DEFAULT 0,
  result_views integer,
  result_ctr numeric,
  result_impressions integer,
  result_avg_view_duration integer,
  result_watch_time_hours numeric,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'rolled_back')),
  proposal_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  measurement_period_days integer NOT NULL DEFAULT 14,
  measured_at timestamptz,
  completed_at timestamptz,
  rolled_back_at timestamptz,
  rollback_reason text,
  performance_delta jsonb,
  lesson_learned text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.video_optimization_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view video_optimization_experiments" ON public.video_optimization_experiments
  FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Service can manage video_optimization_experiments" ON public.video_optimization_experiments
  FOR ALL TO authenticated
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

-- 5. Strategist Daily Runs
CREATE TABLE IF NOT EXISTS public.strategist_daily_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  run_date date NOT NULL DEFAULT CURRENT_DATE,
  execution_id uuid,
  recommendations_count integer NOT NULL DEFAULT 0,
  proposal_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, run_date)
);

ALTER TABLE public.strategist_daily_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view strategist_daily_runs" ON public.strategist_daily_runs
  FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Service can manage strategist_daily_runs" ON public.strategist_daily_runs
  FOR ALL TO authenticated
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

-- 6. Strategist Notifications
CREATE TABLE IF NOT EXISTS public.strategist_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.strategist_daily_runs(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.strategist_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view strategist_notifications" ON public.strategist_notifications
  FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can update strategist_notifications" ON public.strategist_notifications
  FOR UPDATE TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Service can insert strategist_notifications" ON public.strategist_notifications
  FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(workspace_id));

-- Add extra columns to ai_proposals for video optimization
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_proposals' AND column_name = 'proposal_type') THEN
    ALTER TABLE public.ai_proposals ADD COLUMN proposal_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_proposals' AND column_name = 'summary') THEN
    ALTER TABLE public.ai_proposals ADD COLUMN summary text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_proposals' AND column_name = 'proposed_changes') THEN
    ALTER TABLE public.ai_proposals ADD COLUMN proposed_changes jsonb DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_proposals' AND column_name = 'confidence') THEN
    ALTER TABLE public.ai_proposals ADD COLUMN confidence numeric DEFAULT 0.7;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_proposals' AND column_name = 'video_id') THEN
    ALTER TABLE public.ai_proposals ADD COLUMN video_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_proposals' AND column_name = 'optimization_proof') THEN
    ALTER TABLE public.ai_proposals ADD COLUMN optimization_proof jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_proposals' AND column_name = 'thumbnail_prompts') THEN
    ALTER TABLE public.ai_proposals ADD COLUMN thumbnail_prompts text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_proposals' AND column_name = 'thumbnail_urls') THEN
    ALTER TABLE public.ai_proposals ADD COLUMN thumbnail_urls text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_proposals' AND column_name = 'requires_thumbnail_generation') THEN
    ALTER TABLE public.ai_proposals ADD COLUMN requires_thumbnail_generation boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_proposals' AND column_name = 'execution_status') THEN
    ALTER TABLE public.ai_proposals ADD COLUMN execution_status text DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_proposals' AND column_name = 'entity_type') THEN
    ALTER TABLE public.ai_proposals ADD COLUMN entity_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_proposals' AND column_name = 'entity_id') THEN
    ALTER TABLE public.ai_proposals ADD COLUMN entity_id text;
  END IF;
END $$;

-- Seed: 5 system agent definitions (workspace_id = NULL = global)
INSERT INTO public.agent_definitions (workspace_id, name, slug, description, system_prompt, model, skills, config, enabled, is_system)
VALUES
  (NULL, 'Competitor Analyst', 'competitor-analyst',
   'Monitors competitor channels, identifies trends, and recommends strategic responses.',
   'You are a YouTube competitor intelligence analyst. Analyze competitor data to find actionable insights.',
   'anthropic/claude-sonnet-4-20250514',
   ARRAY['query_youtube_stats','query_competitors','create_proposal','save_insight','memory_search'],
   '{"schedule":"daily","data_tables":["competitor_channels","competitor_stats_history"]}',
   true, true),

  (NULL, 'Content Strategist', 'content-strategist',
   'Analyzes video performance to recommend titles, thumbnails, descriptions, and content ideas.',
   'You are a senior YouTube content strategist. Analyze video performance data and recommend optimizations.',
   'anthropic/claude-sonnet-4-20250514',
   ARRAY['query_youtube_stats','query_all_video_analytics','query_experiments','query_competitors','create_proposal','save_insight','memory_search'],
   '{"schedule":"daily","data_tables":["youtube_video_stats","youtube_video_analytics","video_optimization_experiments"]}',
   true, true),

  (NULL, 'Growth Optimizer', 'growth-optimizer',
   'Tracks subscriber growth, analyzes trends, and recommends growth tactics.',
   'You are a YouTube growth optimization expert. Analyze growth data and recommend high-impact tactics.',
   'anthropic/claude-sonnet-4-20250514',
   ARRAY['query_youtube_stats','query_growth_goals','query_content_pipeline','create_proposal','save_insight','memory_search'],
   '{"schedule":"daily","data_tables":["youtube_channel_stats","growth_goals"]}',
   true, true),

  (NULL, 'Audience Analyst', 'audience-analyst',
   'Analyzes comments, demographics, and engagement patterns for audience insights.',
   'You are a YouTube audience analyst. Analyze comments, demographics, and engagement to uncover audience insights.',
   'anthropic/claude-sonnet-4-20250514',
   ARRAY['query_youtube_stats','query_comments','create_proposal','save_insight','memory_search'],
   '{"schedule":"weekly","data_tables":["youtube_comments","youtube_demographics"]}',
   true, true),

  (NULL, 'Revenue Optimizer', 'revenue-optimizer',
   'Analyzes sponsorship deals, affiliate programs, and revenue streams for optimization.',
   'You are a YouTube revenue optimization expert. Analyze deals, affiliates, and monetization to maximize revenue.',
   'anthropic/claude-sonnet-4-20250514',
   ARRAY['query_youtube_stats','query_revenue_data','query_crm_data','create_proposal','save_insight','memory_search'],
   '{"schedule":"weekly","data_tables":["deals","affiliate_programs","transactions"]}',
   true, true)
ON CONFLICT DO NOTHING;

-- Seed: 16 system skills
INSERT INTO public.agent_skills (workspace_id, name, slug, description, category, skill_type, is_system, input_schema, tool_definitions)
VALUES
  (NULL, 'Query YouTube Stats', 'query_youtube_stats', 'Fetch channel stats and recent video performance', 'content', 'system', true, '{}', '[]'),
  (NULL, 'Query Competitors', 'query_competitors', 'Fetch competitor channel data and stats history', 'competitor', 'system', true, '{}', '[]'),
  (NULL, 'Query Content Pipeline', 'query_content_pipeline', 'Fetch video queue and AI content suggestions', 'content', 'system', true, '{}', '[]'),
  (NULL, 'Query CRM Data', 'query_crm_data', 'Fetch contacts, deals, and companies', 'revenue', 'system', true, '{}', '[]'),
  (NULL, 'Query Revenue Data', 'query_revenue_data', 'Fetch deals, affiliates, transactions, rate cards', 'revenue', 'system', true, '{}', '[]'),
  (NULL, 'Query Comments', 'query_comments', 'Fetch YouTube comments and lead comments', 'audience', 'system', true, '{}', '[]'),
  (NULL, 'Query Growth Goals', 'query_growth_goals', 'Fetch active growth goals and targets', 'growth', 'system', true, '{}', '[]'),
  (NULL, 'Create Proposal', 'create_proposal', 'Create an actionable proposal for review', 'general', 'system', true, '{}', '[]'),
  (NULL, 'Save Insight', 'save_insight', 'Save a strategic insight to long-term memory', 'general', 'system', true, '{}', '[]'),
  (NULL, 'Memory Search', 'memory_search', 'Search long-term memory for past insights', 'general', 'system', true, '{}', '[]'),
  (NULL, 'Query All Video Analytics', 'query_all_video_analytics', 'Fetch comprehensive analytics for all videos with percentile rankings', 'content', 'system', true, '{}', '[]'),
  (NULL, 'Query Experiments', 'query_experiments', 'Fetch video optimization experiments and results', 'content', 'system', true, '{}', '[]'),
  (NULL, 'Competitor Trend Analysis', 'competitor_trend_analysis', 'Analyze competitor upload patterns and growth trends', 'competitor', 'system', true, '{}', '[]'),
  (NULL, 'Audience Sentiment Analysis', 'audience_sentiment_analysis', 'Analyze comment sentiment and audience mood', 'audience', 'system', true, '{}', '[]'),
  (NULL, 'Revenue Forecasting', 'revenue_forecasting', 'Project revenue based on current pipeline and trends', 'revenue', 'system', true, '{}', '[]'),
  (NULL, 'Growth Trajectory Analysis', 'growth_trajectory_analysis', 'Analyze subscriber growth trajectory vs goals', 'growth', 'system', true, '{}', '[]')
ON CONFLICT DO NOTHING;
