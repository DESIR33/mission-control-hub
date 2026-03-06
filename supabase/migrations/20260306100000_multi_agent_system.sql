-- ============================================================
-- Multi-Agent AI System: Tables + Seed Data
-- ============================================================

-- Agent Definitions: stores each agent's configuration
CREATE TABLE IF NOT EXISTS public.agent_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  system_prompt TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT 'anthropic/claude-sonnet-4-20250514',
  skills JSONB NOT NULL DEFAULT '[]',
  config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_defs_ws_slug
  ON public.agent_definitions (workspace_id, slug)
  WHERE workspace_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_defs_system_slug
  ON public.agent_definitions (slug)
  WHERE workspace_id IS NULL AND is_system = true;

ALTER TABLE public.agent_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view agent_definitions"
  ON public.agent_definitions FOR SELECT TO authenticated
  USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert agent_definitions"
  ON public.agent_definitions FOR INSERT TO authenticated
  WITH CHECK (workspace_id IS NOT NULL AND public.get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator']));

CREATE POLICY "Operators+ can update agent_definitions"
  ON public.agent_definitions FOR UPDATE TO authenticated
  USING (workspace_id IS NOT NULL AND public.get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator']));

CREATE POLICY "Admins can delete agent_definitions"
  ON public.agent_definitions FOR DELETE TO authenticated
  USING (workspace_id IS NOT NULL AND public.get_workspace_role(workspace_id) = 'admin');

CREATE TRIGGER update_agent_definitions_updated_at
  BEFORE UPDATE ON public.agent_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Agent Skills: modular skill registry
CREATE TABLE IF NOT EXISTS public.agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  input_schema JSONB NOT NULL DEFAULT '{}',
  skill_type TEXT NOT NULL DEFAULT 'system' CHECK (skill_type IN ('system', 'custom')),
  tool_definitions JSONB NOT NULL DEFAULT '[]',
  handler_code TEXT,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('competitor', 'content', 'growth', 'audience', 'revenue', 'general')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_skills_ws_slug
  ON public.agent_skills (workspace_id, slug)
  WHERE workspace_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_skills_system_slug
  ON public.agent_skills (slug)
  WHERE workspace_id IS NULL AND is_system = true;

ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view agent_skills"
  ON public.agent_skills FOR SELECT TO authenticated
  USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert agent_skills"
  ON public.agent_skills FOR INSERT TO authenticated
  WITH CHECK (workspace_id IS NOT NULL AND public.get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator']));

CREATE POLICY "Operators+ can update agent_skills"
  ON public.agent_skills FOR UPDATE TO authenticated
  USING (workspace_id IS NOT NULL AND public.get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator']));

CREATE POLICY "Admins can delete agent_skills"
  ON public.agent_skills FOR DELETE TO authenticated
  USING (workspace_id IS NOT NULL AND public.get_workspace_role(workspace_id) = 'admin');

CREATE TRIGGER update_agent_skills_updated_at
  BEFORE UPDATE ON public.agent_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Agent Executions: log of every agent run
CREATE TABLE IF NOT EXISTS public.agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agent_definitions(id) ON DELETE SET NULL,
  agent_slug TEXT NOT NULL,
  skill_slug TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'scheduled', 'chat')),
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  proposals_created INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_executions_ws ON public.agent_executions (workspace_id, created_at DESC);
CREATE INDEX idx_agent_executions_agent ON public.agent_executions (agent_id, created_at DESC);
CREATE INDEX idx_agent_executions_status ON public.agent_executions (workspace_id, status);

ALTER TABLE public.agent_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view agent_executions"
  ON public.agent_executions FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "System can insert agent_executions"
  ON public.agent_executions FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "System can update agent_executions"
  ON public.agent_executions FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- ============================================================
-- Seed: System agent definitions (workspace_id = NULL)
-- ============================================================

INSERT INTO public.agent_definitions (workspace_id, name, slug, description, system_prompt, model, skills, config, is_system) VALUES
(
  NULL,
  'Competitor Analyst',
  'competitor-analyst',
  'Monitors competitor channels, detects trending topics, and identifies content gaps to exploit for growth.',
  'You are a YouTube competitive intelligence analyst for a creator channel called "Hustling Labs". Your job is to analyze competitor data and surface actionable insights. Focus on: upload patterns, trending topics in the niche, content gaps the creator can exploit, and metrics comparisons. Always create proposals for actionable findings. Be specific with numbers and data.',
  'anthropic/claude-sonnet-4-20250514',
  '["analyze_competitor_uploads", "compare_metrics", "detect_trending_topics", "content_gap_analysis"]',
  '{"schedule": "daily", "data_tables": ["competitor_channels", "competitor_stats_history", "youtube_video_stats"]}',
  true
),
(
  NULL,
  'Content Strategist',
  'content-strategist',
  'Suggests video topics, optimizes titles, and plans the content calendar based on performance data.',
  'You are a YouTube content strategist for "Hustling Labs". Your job is to analyze content performance data and suggest what to create next. Focus on: which topics/formats perform best, title optimization, upload timing, and content calendar planning. Create proposals for specific video ideas with predicted impact. Be data-driven.',
  'anthropic/claude-sonnet-4-20250514',
  '["suggest_video_topics", "optimize_titles", "analyze_performance_patterns", "plan_content_calendar"]',
  '{"schedule": "every_3_days", "data_tables": ["video_queue", "youtube_video_stats", "youtube_channel_stats", "ai_content_suggestions"]}',
  true
),
(
  NULL,
  'Growth Optimizer',
  'growth-optimizer',
  'Analyzes growth trajectory, identifies growth levers, and forecasts subscriber milestones.',
  'You are a YouTube growth optimizer for "Hustling Labs". Your job is to analyze growth data and identify the fastest path to subscriber milestones. Focus on: growth rate trends, which content drives subscribers, engagement optimization, and forecasting. Create proposals for specific growth tactics with expected impact. Be quantitative.',
  'anthropic/claude-sonnet-4-20250514',
  '["analyze_growth_trajectory", "identify_growth_levers", "subscriber_forecast", "engagement_optimization"]',
  '{"schedule": "daily", "data_tables": ["youtube_channel_stats", "growth_goals", "youtube_video_stats"]}',
  true
),
(
  NULL,
  'Audience Analyst',
  'audience-analyst',
  'Analyzes comments, detects sentiment trends, and surfaces audience insights for engagement.',
  'You are a YouTube audience analyst for "Hustling Labs". Your job is to understand the audience through their engagement signals. Focus on: comment sentiment trends, recurring requests/questions, audience demographics patterns, and engagement optimization. Create proposals for engagement strategies. Surface interesting audience insights.',
  'anthropic/claude-sonnet-4-20250514',
  '["analyze_comments", "detect_sentiment_trends", "audience_insights", "engagement_patterns"]',
  '{"schedule": "every_3_days", "data_tables": ["youtube_comments", "youtube_lead_comments", "youtube_video_stats"]}',
  true
),
(
  NULL,
  'Revenue Optimizer',
  'revenue-optimizer',
  'Analyzes sponsorship pipeline, optimizes affiliate performance, and forecasts revenue.',
  'You are a revenue optimization specialist for "Hustling Labs". Your job is to maximize channel revenue across all streams: sponsorships, affiliates, and products. Focus on: deal pipeline health, affiliate performance optimization, revenue forecasting, and identifying new monetization opportunities. Create proposals for revenue-generating actions.',
  'anthropic/claude-sonnet-4-20250514',
  '["analyze_sponsorship_pipeline", "optimize_affiliates", "revenue_forecast", "monetization_gaps"]',
  '{"schedule": "weekly", "data_tables": ["deals", "affiliate_programs", "transactions", "rate_cards"]}',
  true
);

-- ============================================================
-- Seed: System skill definitions (workspace_id = NULL)
-- ============================================================

INSERT INTO public.agent_skills (workspace_id, name, slug, description, category, is_system, tool_definitions) VALUES
-- Competitor skills
(NULL, 'Analyze Competitor Uploads', 'analyze_competitor_uploads', 'Fetch and analyze recent upload patterns from competitor channels', 'competitor', true,
 '[{"type":"function","function":{"name":"analyze_competitor_uploads","description":"Analyze recent upload patterns, frequency, and topics from tracked competitor channels","parameters":{"type":"object","properties":{"time_range_days":{"type":"integer","default":30}},"required":[]}}}]'),

(NULL, 'Compare Metrics', 'compare_metrics', 'Compare your channel metrics against competitors', 'competitor', true,
 '[{"type":"function","function":{"name":"compare_metrics","description":"Compare subscriber count, views, engagement rate, and growth velocity against tracked competitors","parameters":{"type":"object","properties":{"metrics":{"type":"array","items":{"type":"string","enum":["subscribers","views","engagement","upload_frequency"]}}},"required":[]}}}]'),

(NULL, 'Detect Trending Topics', 'detect_trending_topics', 'Identify trending topics in your niche by analyzing competitor content', 'competitor', true,
 '[{"type":"function","function":{"name":"detect_trending_topics","description":"Identify trending topics and formats in the niche by analyzing what competitors are publishing and what performs well","parameters":{"type":"object","properties":{"time_range_days":{"type":"integer","default":14}},"required":[]}}}]'),

(NULL, 'Content Gap Analysis', 'content_gap_analysis', 'Find topics competitors cover that you haven''t', 'competitor', true,
 '[{"type":"function","function":{"name":"content_gap_analysis","description":"Identify content topics and formats that competitors cover successfully but you have not yet addressed","parameters":{"type":"object","properties":{},"required":[]}}}]'),

-- Content skills
(NULL, 'Suggest Video Topics', 'suggest_video_topics', 'Generate data-driven video topic suggestions based on performance patterns', 'content', true,
 '[{"type":"function","function":{"name":"suggest_video_topics","description":"Generate video topic suggestions based on channel performance data, audience signals, and trending topics","parameters":{"type":"object","properties":{"count":{"type":"integer","default":5},"focus":{"type":"string","enum":["growth","engagement","revenue","trending"]}},"required":[]}}}]'),

(NULL, 'Optimize Titles', 'optimize_titles', 'Analyze and suggest improvements for video titles', 'content', true,
 '[{"type":"function","function":{"name":"optimize_titles","description":"Analyze existing video titles for CTR potential and suggest optimized alternatives","parameters":{"type":"object","properties":{"video_ids":{"type":"array","items":{"type":"string"}}},"required":[]}}}]'),

(NULL, 'Analyze Performance Patterns', 'analyze_performance_patterns', 'Identify patterns in video performance data', 'content', true,
 '[{"type":"function","function":{"name":"analyze_performance_patterns","description":"Analyze video performance data to identify patterns in what drives views, engagement, and subscriber growth","parameters":{"type":"object","properties":{"time_range_days":{"type":"integer","default":90}},"required":[]}}}]'),

(NULL, 'Plan Content Calendar', 'plan_content_calendar', 'Generate a content calendar based on data insights', 'content', true,
 '[{"type":"function","function":{"name":"plan_content_calendar","description":"Generate a recommended content calendar for the next 2-4 weeks based on performance data and strategic goals","parameters":{"type":"object","properties":{"weeks":{"type":"integer","default":2}},"required":[]}}}]'),

-- Growth skills
(NULL, 'Analyze Growth Trajectory', 'analyze_growth_trajectory', 'Analyze current growth rate and trajectory toward goals', 'growth', true,
 '[{"type":"function","function":{"name":"analyze_growth_trajectory","description":"Analyze subscriber growth rate, velocity changes, and trajectory toward the growth goal","parameters":{"type":"object","properties":{},"required":[]}}}]'),

(NULL, 'Identify Growth Levers', 'identify_growth_levers', 'Find the top factors driving subscriber growth', 'growth', true,
 '[{"type":"function","function":{"name":"identify_growth_levers","description":"Identify which content types, topics, upload times, and engagement strategies drive the most subscriber growth","parameters":{"type":"object","properties":{},"required":[]}}}]'),

(NULL, 'Subscriber Forecast', 'subscriber_forecast', 'Forecast subscriber milestones based on current trajectory', 'growth', true,
 '[{"type":"function","function":{"name":"subscriber_forecast","description":"Forecast when the channel will hit key subscriber milestones (25K, 50K, 100K) based on current and projected growth rates","parameters":{"type":"object","properties":{},"required":[]}}}]'),

(NULL, 'Engagement Optimization', 'engagement_optimization', 'Analyze and suggest ways to improve audience engagement', 'growth', true,
 '[{"type":"function","function":{"name":"engagement_optimization","description":"Analyze engagement metrics (likes, comments, shares, watch time) and suggest specific tactics to improve them","parameters":{"type":"object","properties":{},"required":[]}}}]'),

-- Audience skills
(NULL, 'Analyze Comments', 'analyze_comments', 'Analyze comment trends and extract audience insights', 'audience', true,
 '[{"type":"function","function":{"name":"analyze_comments","description":"Analyze recent YouTube comments for sentiment, common questions, feature requests, and engagement patterns","parameters":{"type":"object","properties":{"video_id":{"type":"string"},"limit":{"type":"integer","default":100}},"required":[]}}}]'),

(NULL, 'Detect Sentiment Trends', 'detect_sentiment_trends', 'Track audience sentiment changes over time', 'audience', true,
 '[{"type":"function","function":{"name":"detect_sentiment_trends","description":"Track how audience sentiment has changed over recent videos and identify what causes positive or negative shifts","parameters":{"type":"object","properties":{"time_range_days":{"type":"integer","default":30}},"required":[]}}}]'),

-- Revenue skills
(NULL, 'Analyze Sponsorship Pipeline', 'analyze_sponsorship_pipeline', 'Review deal pipeline health and suggest actions', 'revenue', true,
 '[{"type":"function","function":{"name":"analyze_sponsorship_pipeline","description":"Analyze the current sponsorship deal pipeline: stage distribution, stale deals, expected revenue, and recommended actions","parameters":{"type":"object","properties":{},"required":[]}}}]'),

(NULL, 'Revenue Forecast', 'revenue_forecast', 'Forecast revenue across all streams', 'revenue', true,
 '[{"type":"function","function":{"name":"revenue_forecast","description":"Forecast revenue for the next 3-6 months across sponsorships, affiliates, and products based on current pipeline and trends","parameters":{"type":"object","properties":{"months":{"type":"integer","default":3}},"required":[]}}}]');
