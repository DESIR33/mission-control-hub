
-- Agent A/B Tests
CREATE TABLE public.agent_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  agent_slug text NOT NULL,
  variant_a_prompt text NOT NULL DEFAULT '',
  variant_a_model text NOT NULL DEFAULT 'minimax/minimax-m2.5',
  variant_b_prompt text NOT NULL DEFAULT '',
  variant_b_model text NOT NULL DEFAULT 'minimax/minimax-m2.5',
  test_input text NOT NULL DEFAULT '',
  variant_a_output text,
  variant_b_output text,
  winner text,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.agent_ab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view agent_ab_tests" ON public.agent_ab_tests FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Operators+ can manage agent_ab_tests" ON public.agent_ab_tests FOR ALL USING (get_workspace_role(workspace_id) = ANY(ARRAY['admin','operator','contributor'])) WITH CHECK (get_workspace_role(workspace_id) = ANY(ARRAY['admin','operator','contributor']));

-- Agent Collaboration Threads
CREATE TABLE public.agent_collaboration_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_collaboration_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view collaboration_threads" ON public.agent_collaboration_threads FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can manage collaboration_threads" ON public.agent_collaboration_threads FOR ALL USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));

CREATE TABLE public.agent_collaboration_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES agent_collaboration_threads(id) ON DELETE CASCADE,
  agent_slug text NOT NULL,
  content text NOT NULL DEFAULT '',
  handoff_to text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_collaboration_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view collab_messages" ON public.agent_collaboration_messages FOR SELECT USING (EXISTS (SELECT 1 FROM agent_collaboration_threads t WHERE t.id = agent_collaboration_messages.thread_id AND is_workspace_member(t.workspace_id)));
CREATE POLICY "Members can manage collab_messages" ON public.agent_collaboration_messages FOR ALL USING (EXISTS (SELECT 1 FROM agent_collaboration_threads t WHERE t.id = agent_collaboration_messages.thread_id AND is_workspace_member(t.workspace_id))) WITH CHECK (EXISTS (SELECT 1 FROM agent_collaboration_threads t WHERE t.id = agent_collaboration_messages.thread_id AND is_workspace_member(t.workspace_id)));

-- Auto-execution rules
CREATE TABLE public.auto_execution_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_slug text NOT NULL,
  confidence_threshold numeric NOT NULL DEFAULT 0.9,
  enabled boolean NOT NULL DEFAULT true,
  auto_executed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.auto_execution_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view auto_execution_rules" ON public.auto_execution_rules FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Admins can manage auto_execution_rules" ON public.auto_execution_rules FOR ALL USING (get_workspace_role(workspace_id) = 'admin') WITH CHECK (get_workspace_role(workspace_id) = 'admin');

-- Thumbnail A/B Tests tracker
CREATE TABLE public.thumbnail_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  youtube_video_id text NOT NULL,
  video_title text NOT NULL DEFAULT '',
  variant_a_url text NOT NULL DEFAULT '',
  variant_b_url text NOT NULL DEFAULT '',
  variant_a_ctr numeric,
  variant_b_ctr numeric,
  variant_a_impressions integer DEFAULT 0,
  variant_b_impressions integer DEFAULT 0,
  winner text,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.thumbnail_ab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view thumbnail_ab_tests" ON public.thumbnail_ab_tests FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can manage thumbnail_ab_tests" ON public.thumbnail_ab_tests FOR ALL USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));

-- Video subtitles (SRT uploads)
CREATE TABLE public.video_subtitles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  youtube_video_id text NOT NULL,
  video_title text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'en',
  srt_content text NOT NULL DEFAULT '',
  parsed_segments jsonb DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.video_subtitles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view video_subtitles" ON public.video_subtitles FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can manage video_subtitles" ON public.video_subtitles FOR ALL USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));
