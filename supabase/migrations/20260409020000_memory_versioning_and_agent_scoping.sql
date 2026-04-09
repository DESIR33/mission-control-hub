
-- ============================================
-- Feature 3: Memory Versioning
-- Feature 4: Per-Agent Memory Scoping
-- ============================================

-- ── FEATURE 3: MEMORY VERSIONING ──

-- Version history table
CREATE TABLE IF NOT EXISTS public.memory_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.assistant_memory(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  content TEXT NOT NULL,
  origin TEXT,
  tags TEXT[],
  memory_type TEXT,
  confidence_score NUMERIC,
  importance_score NUMERIC,
  embedding vector(1536),
  changed_by TEXT DEFAULT 'system',
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(memory_id, version_number)
);

-- Add current version tracking to assistant_memory
ALTER TABLE public.assistant_memory
  ADD COLUMN IF NOT EXISTS current_version INT DEFAULT 1;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memory_versions_memory
  ON public.memory_versions (memory_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_memory_versions_created
  ON public.memory_versions (memory_id, created_at DESC);

-- RLS
ALTER TABLE public.memory_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view memory versions"
  ON public.memory_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assistant_memory m
      WHERE m.id = memory_versions.memory_id
        AND public.is_workspace_member(m.workspace_id)
    )
  );

CREATE POLICY "Workspace operators can insert memory versions"
  ON public.memory_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assistant_memory m
      WHERE m.id = memory_versions.memory_id
        AND public.is_workspace_member(m.workspace_id)
    )
  );

-- ── FEATURE 4: PER-AGENT MEMORY SCOPING ──

-- Junction table for memory-agent scope relationships
CREATE TABLE IF NOT EXISTS public.memory_agent_scope (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.assistant_memory(id) ON DELETE CASCADE,
  agent_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(memory_id, agent_slug)
);

-- Denormalized column on assistant_memory for fast search filtering
ALTER TABLE public.assistant_memory
  ADD COLUMN IF NOT EXISTS agent_scope TEXT[];

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memory_agent_scope_slug
  ON public.memory_agent_scope (agent_slug);

CREATE INDEX IF NOT EXISTS idx_memory_agent_scope_memory
  ON public.memory_agent_scope (memory_id);

CREATE INDEX IF NOT EXISTS idx_memory_ws_agent_scope
  ON public.assistant_memory USING GIN (agent_scope)
  WHERE agent_scope IS NOT NULL;

-- RLS
ALTER TABLE public.memory_agent_scope ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view memory agent scopes"
  ON public.memory_agent_scope FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assistant_memory m
      WHERE m.id = memory_agent_scope.memory_id
        AND public.is_workspace_member(m.workspace_id)
    )
  );

CREATE POLICY "Workspace members can manage memory agent scopes"
  ON public.memory_agent_scope FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assistant_memory m
      WHERE m.id = memory_agent_scope.memory_id
        AND public.is_workspace_member(m.workspace_id)
    )
  );

-- ── UPDATED SEARCH FUNCTIONS WITH AGENT SCOPING ──

-- Update hybrid_memory_search with agent_slug_filter
CREATE OR REPLACE FUNCTION public.hybrid_memory_search(
  query_embedding text,
  query_text text,
  ws_id uuid,
  origin_filter text DEFAULT 'any',
  match_count integer DEFAULT 5,
  agent_slug_filter text DEFAULT NULL
)
RETURNS TABLE(id uuid, content text, origin text, tags text[], rrf_score double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  k constant int := 60;
  has_embedding boolean;
begin
  has_embedding := query_embedding IS NOT NULL
    AND query_embedding != ''
    AND query_embedding != '[]'
    AND length(query_embedding) > 10;

  IF has_embedding THEN
    return query
    with vector_results as (
      select m.id, row_number() over (order by m.embedding <=> query_embedding::vector) as vrank
      from assistant_memory m
      where m.workspace_id = ws_id
        and (origin_filter = 'any' or m.origin = origin_filter)
        and m.embedding is not null
        and m.review_status = 'approved'
        and (agent_slug_filter IS NULL OR m.agent_scope IS NULL OR agent_slug_filter = ANY(m.agent_scope))
      order by m.embedding <=> query_embedding::vector
      limit 20
    ),
    fts_results as (
      select m.id, row_number() over (order by ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', query_text)) desc) as frank
      from assistant_memory m
      where m.workspace_id = ws_id
        and (origin_filter = 'any' or m.origin = origin_filter)
        and m.review_status = 'approved'
        and query_text is not null and query_text != ''
        and to_tsvector('english', m.content) @@ plainto_tsquery('english', query_text)
        and (agent_slug_filter IS NULL OR m.agent_scope IS NULL OR agent_slug_filter = ANY(m.agent_scope))
      limit 20
    ),
    fused as (
      select
        coalesce(v.id, f.id) as fused_id,
        coalesce(0.7 / (v.vrank + k), 0) + coalesce(0.3 / (f.frank + k), 0) as score
      from vector_results v
      full outer join fts_results f on v.id = f.id
    )
    select m.id, m.content, m.origin, m.tags, f.score as rrf_score
    from fused f
    join assistant_memory m on m.id = f.fused_id
    order by f.score desc
    limit match_count;
  ELSE
    return query
    select m.id, m.content, m.origin, m.tags,
           ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', query_text))::double precision as rrf_score
    from assistant_memory m
    where m.workspace_id = ws_id
      and (origin_filter = 'any' or m.origin = origin_filter)
      and m.review_status = 'approved'
      and query_text is not null and query_text != ''
      and to_tsvector('english', m.content) @@ plainto_tsquery('english', query_text)
      and (agent_slug_filter IS NULL OR m.agent_scope IS NULL OR agent_slug_filter = ANY(m.agent_scope))
    order by rrf_score desc
    limit match_count;
  END IF;
end;
$$;

-- Update memory_vector_search with agent_slug_filter
CREATE OR REPLACE FUNCTION public.memory_vector_search(
  query_embedding vector,
  ws_id UUID,
  match_count INT DEFAULT 10,
  memory_type_filter TEXT DEFAULT NULL,
  entity_type_filter TEXT DEFAULT NULL,
  entity_id_filter UUID DEFAULT NULL,
  include_expired BOOLEAN DEFAULT false,
  agent_slug_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  memory_type TEXT,
  origin TEXT,
  tags TEXT[],
  entity_type TEXT,
  entity_id UUID,
  confidence_score NUMERIC,
  importance_score NUMERIC,
  is_pinned BOOLEAN,
  similarity DOUBLE PRECISION,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.memory_type,
    m.origin,
    m.tags,
    m.entity_type,
    m.entity_id,
    m.confidence_score,
    m.importance_score,
    m.is_pinned,
    1 - (m.embedding <=> query_embedding)::double precision AS similarity,
    m.created_at
  FROM assistant_memory m
  WHERE m.workspace_id = ws_id
    AND m.review_status = 'approved'
    AND m.embedding IS NOT NULL
    AND (memory_type_filter IS NULL OR m.memory_type = memory_type_filter)
    AND (entity_type_filter IS NULL OR m.entity_type = entity_type_filter)
    AND (entity_id_filter IS NULL OR m.entity_id = entity_id_filter)
    AND (include_expired = true OR m.valid_until IS NULL OR m.valid_until > now())
    AND (agent_slug_filter IS NULL OR m.agent_scope IS NULL OR agent_slug_filter = ANY(m.agent_scope))
  ORDER BY
    m.is_pinned DESC,
    (1 - (m.embedding <=> query_embedding)) * m.confidence_score * m.importance_score DESC
  LIMIT match_count;
END;
$$;

-- ── HELPER: Create memory version before update ──

CREATE OR REPLACE FUNCTION public.create_memory_version(
  p_memory_id UUID,
  p_changed_by TEXT DEFAULT 'system',
  p_change_reason TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version INT;
BEGIN
  -- Get current version number
  SELECT COALESCE(m.current_version, 1) INTO v_version
  FROM assistant_memory m WHERE m.id = p_memory_id;

  -- Snapshot current state into memory_versions
  INSERT INTO memory_versions (memory_id, version_number, content, origin, tags, memory_type, confidence_score, importance_score, embedding, changed_by, change_reason)
  SELECT m.id, v_version, m.content, m.origin, m.tags, m.memory_type, m.confidence_score, m.importance_score, m.embedding, p_changed_by, p_change_reason
  FROM assistant_memory m
  WHERE m.id = p_memory_id;

  -- Increment version on the memory
  UPDATE assistant_memory SET current_version = v_version + 1 WHERE id = p_memory_id;

  RETURN v_version + 1;
END;
$$;
