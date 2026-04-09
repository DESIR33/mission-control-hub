
CREATE TYPE public.memory_edge_type AS ENUM ('derived_from', 'supports', 'contradicts', 'supersedes');

CREATE TABLE public.memory_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  from_id UUID NOT NULL REFERENCES public.assistant_memory(id) ON DELETE CASCADE,
  to_id UUID NOT NULL REFERENCES public.assistant_memory(id) ON DELETE CASCADE,
  edge_type public.memory_edge_type NOT NULL DEFAULT 'supports',
  weight NUMERIC(3,2) NOT NULL DEFAULT 0.5 CHECK (weight >= 0 AND weight <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_id, to_id, edge_type)
);

CREATE INDEX idx_memory_edges_workspace ON public.memory_edges(workspace_id);
CREATE INDEX idx_memory_edges_from ON public.memory_edges(from_id);
CREATE INDEX idx_memory_edges_to ON public.memory_edges(to_id);

ALTER TABLE public.memory_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view edges"
  ON public.memory_edges FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert edges"
  ON public.memory_edges FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update edges"
  ON public.memory_edges FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete edges"
  ON public.memory_edges FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id));
