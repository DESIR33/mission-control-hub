
-- Ops daily items: scored aggregation of tasks, proposals, deals, content milestones
CREATE TABLE public.ops_daily_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_type text NOT NULL, -- 'task' | 'proposal' | 'deal' | 'inbox' | 'content'
  source_id text NOT NULL,
  title text NOT NULL,
  subtitle text,
  urgency_score numeric NOT NULL DEFAULT 0,
  urgency_factors jsonb DEFAULT '{}',
  time_block text, -- 'morning' | 'afternoon' | 'evening'
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'snoozed' | 'done' | 'dismissed'
  snoozed_until timestamptz,
  due_at timestamptz,
  metadata jsonb DEFAULT '{}',
  scored_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, source_type, source_id)
);

ALTER TABLE public.ops_daily_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view ops items" ON public.ops_daily_items
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update ops items" ON public.ops_daily_items
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Service can insert ops items" ON public.ops_daily_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Service can delete ops items" ON public.ops_daily_items
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE INDEX idx_ops_daily_workspace_status ON public.ops_daily_items(workspace_id, status);
CREATE INDEX idx_ops_daily_urgency ON public.ops_daily_items(workspace_id, urgency_score DESC);

-- Completion outcomes for learning
CREATE TABLE public.ops_completion_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ops_item_id uuid REFERENCES public.ops_daily_items(id) ON DELETE SET NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  action_taken text NOT NULL, -- 'completed' | 'dismissed' | 'snoozed' | 'approved' | 'rejected' | 'followed_up'
  urgency_score_at_action numeric,
  time_to_action_minutes integer,
  outcome_quality text, -- 'positive' | 'neutral' | 'negative' (feedback loop)
  metadata jsonb DEFAULT '{}',
  acted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_completion_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view outcomes" ON public.ops_completion_outcomes
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can insert outcomes" ON public.ops_completion_outcomes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE INDEX idx_outcomes_workspace ON public.ops_completion_outcomes(workspace_id, acted_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_ops_daily_items_updated_at
  BEFORE UPDATE ON public.ops_daily_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
