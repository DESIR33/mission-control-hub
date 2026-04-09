
CREATE TYPE public.conflict_type AS ENUM ('factual', 'temporal', 'preference', 'scope');
CREATE TYPE public.conflict_status AS ENUM ('pending', 'resolved');

CREATE TABLE public.memory_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  memory_a_id UUID NOT NULL REFERENCES public.assistant_memory(id) ON DELETE CASCADE,
  memory_b_id UUID NOT NULL REFERENCES public.assistant_memory(id) ON DELETE CASCADE,
  conflict_type public.conflict_type NOT NULL DEFAULT 'factual',
  status public.conflict_status NOT NULL DEFAULT 'pending',
  resolution_type TEXT,
  resolved_by_memory_id UUID REFERENCES public.assistant_memory(id) ON DELETE SET NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_memory_conflicts_workspace_status ON public.memory_conflicts(workspace_id, status);

ALTER TABLE public.memory_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view conflicts"
  ON public.memory_conflicts FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert conflicts"
  ON public.memory_conflicts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update conflicts"
  ON public.memory_conflicts FOR UPDATE
  TO authenticated
  USING (public.is_workspace_member(workspace_id));
