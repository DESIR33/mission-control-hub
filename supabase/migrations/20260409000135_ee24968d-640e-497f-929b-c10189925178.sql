
-- ============================================
-- Upgrade assistant_memory to structured memory layer
-- ============================================

-- Add new columns to assistant_memory
ALTER TABLE public.assistant_memory
  ADD COLUMN IF NOT EXISTS memory_type TEXT DEFAULT 'semantic',
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_session_id UUID,
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS access_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS decay_rate NUMERIC DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS related_memory_ids UUID[],
  ADD COLUMN IF NOT EXISTS importance_score NUMERIC DEFAULT 0.5;

-- Backfill existing rows: map origin → source_type
UPDATE public.assistant_memory
SET source_type = CASE
  WHEN origin = 'conversation' THEN 'conversation'
  WHEN origin = 'agent' THEN 'agent'
  WHEN origin = 'import' THEN 'import'
  WHEN origin = 'system' THEN 'system'
  ELSE 'manual'
END
WHERE source_type IS NULL OR source_type = 'manual';

-- ============================================
-- Indexes
-- ============================================

-- GIN index on tags
CREATE INDEX IF NOT EXISTS idx_memory_tags ON public.assistant_memory USING GIN (tags);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_memory_ws_type_status
  ON public.assistant_memory (workspace_id, memory_type, review_status);

CREATE INDEX IF NOT EXISTS idx_memory_ws_entity
  ON public.assistant_memory (workspace_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_memory_ws_valid_until
  ON public.assistant_memory (workspace_id, valid_until)
  WHERE valid_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_memory_ws_pinned
  ON public.assistant_memory (workspace_id)
  WHERE is_pinned = true;

-- IVFFlat index for vector cosine similarity (requires sufficient rows)
-- Using HNSW which works better with smaller datasets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'assistant_memory' AND indexname = 'idx_memory_embedding_cosine'
  ) THEN
    CREATE INDEX idx_memory_embedding_cosine
      ON public.assistant_memory
      USING hnsw (embedding vector_cosine_ops);
  END IF;
END $$;

-- ============================================
-- Enhanced memory_search function
-- ============================================

CREATE OR REPLACE FUNCTION public.memory_vector_search(
  query_embedding vector,
  ws_id UUID,
  match_count INT DEFAULT 10,
  memory_type_filter TEXT DEFAULT NULL,
  entity_type_filter TEXT DEFAULT NULL,
  entity_id_filter UUID DEFAULT NULL,
  include_expired BOOLEAN DEFAULT false
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
  ORDER BY
    m.is_pinned DESC,
    (1 - (m.embedding <=> query_embedding)) * m.confidence_score * m.importance_score DESC
  LIMIT match_count;
END;
$$;

-- ============================================
-- Memory access log table
-- ============================================

CREATE TABLE IF NOT EXISTS public.memory_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.assistant_memory(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  accessed_by TEXT NOT NULL DEFAULT 'user',
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  query_context TEXT
);

ALTER TABLE public.memory_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view memory access logs"
  ON public.memory_access_log FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert memory access logs"
  ON public.memory_access_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE INDEX IF NOT EXISTS idx_memory_access_log_memory
  ON public.memory_access_log (memory_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_access_log_ws
  ON public.memory_access_log (workspace_id, accessed_at DESC);

-- ============================================
-- Helper: log access and bump counters
-- ============================================

CREATE OR REPLACE FUNCTION public.record_memory_access(
  p_memory_id UUID,
  p_workspace_id UUID,
  p_accessed_by TEXT DEFAULT 'user',
  p_query_context TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE assistant_memory
  SET last_accessed_at = now(),
      access_count = access_count + 1
  WHERE id = p_memory_id AND workspace_id = p_workspace_id;

  INSERT INTO memory_access_log (memory_id, workspace_id, accessed_by, query_context)
  VALUES (p_memory_id, p_workspace_id, p_accessed_by, p_query_context);
END;
$$;
