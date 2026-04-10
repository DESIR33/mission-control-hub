
-- Memory relationships table for knowledge graph edges
CREATE TABLE public.memory_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_memory_id UUID NOT NULL REFERENCES public.assistant_memory(id) ON DELETE CASCADE,
  target_memory_id UUID NOT NULL REFERENCES public.assistant_memory(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'related_to',
  strength NUMERIC NOT NULL DEFAULT 0.5,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_memory_id, target_memory_id, relationship_type),
  CHECK (source_memory_id != target_memory_id)
);

ALTER TABLE public.memory_relationships ENABLE ROW LEVEL SECURITY;

-- Index for graph traversal in both directions
CREATE INDEX idx_memory_rel_source ON public.memory_relationships (source_memory_id);
CREATE INDEX idx_memory_rel_target ON public.memory_relationships (target_memory_id);
CREATE INDEX idx_memory_rel_type ON public.memory_relationships (relationship_type);

-- RLS: workspace members can view/manage relationships for their memories
CREATE POLICY "Workspace members can view memory relationships"
  ON public.memory_relationships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assistant_memory m
      WHERE m.id = source_memory_id
        AND public.is_workspace_member(m.workspace_id)
    )
  );

CREATE POLICY "Workspace members can insert memory relationships"
  ON public.memory_relationships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assistant_memory m
      WHERE m.id = source_memory_id
        AND public.is_workspace_member(m.workspace_id)
    )
  );

CREATE POLICY "Workspace members can delete memory relationships"
  ON public.memory_relationships FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assistant_memory m
      WHERE m.id = source_memory_id
        AND public.is_workspace_member(m.workspace_id)
    )
  );

-- Helper function: get memory graph neighborhood
CREATE OR REPLACE FUNCTION public.get_memory_graph(
  p_memory_id UUID,
  p_depth INTEGER DEFAULT 1,
  p_workspace_id UUID DEFAULT NULL
)
RETURNS TABLE(
  memory_id UUID,
  content TEXT,
  origin TEXT,
  tags TEXT[],
  entity_type TEXT,
  entity_id UUID,
  depth INTEGER,
  rel_type TEXT,
  rel_strength NUMERIC,
  connected_from UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE graph AS (
    -- Seed: the starting memory
    SELECT
      m.id AS memory_id,
      m.content,
      m.origin,
      m.tags,
      m.entity_type,
      m.entity_id,
      0 AS depth,
      NULL::TEXT AS rel_type,
      NULL::NUMERIC AS rel_strength,
      NULL::UUID AS connected_from
    FROM assistant_memory m
    WHERE m.id = p_memory_id
      AND (p_workspace_id IS NULL OR m.workspace_id = p_workspace_id)

    UNION

    -- Traverse outgoing edges
    SELECT
      m.id,
      m.content,
      m.origin,
      m.tags,
      m.entity_type,
      m.entity_id,
      g.depth + 1,
      r.relationship_type,
      r.strength,
      g.memory_id
    FROM graph g
    JOIN memory_relationships r ON r.source_memory_id = g.memory_id
    JOIN assistant_memory m ON m.id = r.target_memory_id
    WHERE g.depth < p_depth
      AND (p_workspace_id IS NULL OR m.workspace_id = p_workspace_id)

    UNION

    -- Traverse incoming edges
    SELECT
      m.id,
      m.content,
      m.origin,
      m.tags,
      m.entity_type,
      m.entity_id,
      g.depth + 1,
      r.relationship_type,
      r.strength,
      g.memory_id
    FROM graph g
    JOIN memory_relationships r ON r.target_memory_id = g.memory_id
    JOIN assistant_memory m ON m.id = r.source_memory_id
    WHERE g.depth < p_depth
      AND (p_workspace_id IS NULL OR m.workspace_id = p_workspace_id)
  )
  SELECT DISTINCT ON (graph.memory_id) graph.* FROM graph
  ORDER BY graph.memory_id, graph.depth ASC;
END;
$$;
