
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

    UNION ALL

    -- Traverse both directions in one term
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
    JOIN memory_relationships r
      ON r.source_memory_id = g.memory_id OR r.target_memory_id = g.memory_id
    JOIN assistant_memory m
      ON m.id = CASE
        WHEN r.source_memory_id = g.memory_id THEN r.target_memory_id
        ELSE r.source_memory_id
      END
    WHERE g.depth < p_depth
      AND (p_workspace_id IS NULL OR m.workspace_id = p_workspace_id)
  )
  SELECT DISTINCT ON (graph.memory_id) graph.* FROM graph
  ORDER BY graph.memory_id, graph.depth ASC;
END;
$$;
