
CREATE TABLE public.memory_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.assistant_memory(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('up', 'down')),
  query_used TEXT,
  rated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.memory_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage ratings"
  ON public.memory_ratings FOR ALL
  TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE INDEX idx_memory_ratings_memory_id ON public.memory_ratings(memory_id);
CREATE INDEX idx_memory_ratings_workspace_id ON public.memory_ratings(workspace_id);
