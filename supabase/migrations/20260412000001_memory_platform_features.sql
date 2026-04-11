-- ============================================
-- Feature 3: Agent Memory Scopes
-- Activate agent_id and visibility columns in search RPCs
-- ============================================

-- Update hybrid_memory_search to support agent scoping
CREATE OR REPLACE FUNCTION public.hybrid_memory_search(
  query_embedding text,
  query_text text,
  ws_id uuid,
  origin_filter text DEFAULT 'any'::text,
  match_count integer DEFAULT 10,
  search_offset integer DEFAULT 0,
  agent_id_filter text DEFAULT NULL,
  include_shared boolean DEFAULT true
)
RETURNS TABLE(id uuid, content text, origin text, tags text[], rrf_score double precision, agent_id text, visibility text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        and m.status = 'active'
        and m.review_status = 'approved'
        and (origin_filter = 'any' or m.origin = origin_filter)
        and m.embedding is not null
        -- Agent scope filtering
        and (
          agent_id_filter IS NULL
          OR (m.agent_id = agent_id_filter)
          OR (include_shared AND m.visibility = 'shared')
          OR (m.agent_id = 'global')
        )
      order by m.embedding <=> query_embedding::vector
      limit 40
    ),
    fts_results as (
      select m.id, row_number() over (order by ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', query_text)) desc) as frank
      from assistant_memory m
      where m.workspace_id = ws_id
        and m.status = 'active'
        and m.review_status = 'approved'
        and (origin_filter = 'any' or m.origin = origin_filter)
        and query_text is not null and query_text != ''
        and to_tsvector('english', m.content) @@ plainto_tsquery('english', query_text)
        -- Agent scope filtering
        and (
          agent_id_filter IS NULL
          OR (m.agent_id = agent_id_filter)
          OR (include_shared AND m.visibility = 'shared')
          OR (m.agent_id = 'global')
        )
      limit 40
    ),
    fused as (
      select
        coalesce(v.id, f.id) as fused_id,
        coalesce(0.7 / (v.vrank + k), 0) + coalesce(0.3 / (f.frank + k), 0) as score
      from vector_results v
      full outer join fts_results f on v.id = f.id
    ),
    conflicted_ids as (
      select memory_a_id as mid from memory_conflicts where workspace_id = ws_id and status = 'pending'
      union
      select memory_b_id from memory_conflicts where workspace_id = ws_id and status = 'pending'
    )
    select m.id, m.content, m.origin, m.tags,
           f.score * (case when ci.mid is not null then 0.5 else 1.0 end) as rrf_score,
           m.agent_id,
           m.visibility
    from fused f
    join assistant_memory m on m.id = f.fused_id
    left join conflicted_ids ci on ci.mid = m.id
    order by rrf_score desc
    limit match_count
    offset search_offset;
  ELSE
    return query
    with conflicted_ids as (
      select memory_a_id as mid from memory_conflicts where workspace_id = ws_id and status = 'pending'
      union
      select memory_b_id from memory_conflicts where workspace_id = ws_id and status = 'pending'
    )
    select m.id, m.content, m.origin, m.tags,
           ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', query_text))::double precision
             * (case when ci.mid is not null then 0.5 else 1.0 end) as rrf_score,
           m.agent_id,
           m.visibility
    from assistant_memory m
    left join conflicted_ids ci on ci.mid = m.id
    where m.workspace_id = ws_id
      and m.status = 'active'
      and m.review_status = 'approved'
      and (origin_filter = 'any' or m.origin = origin_filter)
      and query_text is not null and query_text != ''
      and to_tsvector('english', m.content) @@ plainto_tsquery('english', query_text)
      -- Agent scope filtering
      and (
        agent_id_filter IS NULL
        OR (m.agent_id = agent_id_filter)
        OR (include_shared AND m.visibility = 'shared')
        OR (m.agent_id = 'global')
      )
    order by rrf_score desc
    limit match_count
    offset search_offset;
  END IF;
end;
$function$;

-- Update memory_vector_search to support agent scoping
CREATE OR REPLACE FUNCTION public.memory_vector_search(
  query_embedding vector,
  ws_id UUID,
  match_count INT DEFAULT 10,
  memory_type_filter TEXT DEFAULT NULL,
  entity_type_filter TEXT DEFAULT NULL,
  entity_id_filter UUID DEFAULT NULL,
  include_expired BOOLEAN DEFAULT false,
  agent_id_filter TEXT DEFAULT NULL,
  include_shared BOOLEAN DEFAULT true
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
  created_at TIMESTAMPTZ,
  agent_id TEXT,
  visibility TEXT
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
    m.created_at,
    m.agent_id,
    m.visibility
  FROM assistant_memory m
  WHERE m.workspace_id = ws_id
    AND m.review_status = 'approved'
    AND m.embedding IS NOT NULL
    AND (memory_type_filter IS NULL OR m.memory_type = memory_type_filter)
    AND (entity_type_filter IS NULL OR m.entity_type = entity_type_filter)
    AND (entity_id_filter IS NULL OR m.entity_id = entity_id_filter)
    AND (include_expired = true OR m.valid_until IS NULL OR m.valid_until > now())
    -- Agent scope filtering
    AND (
      agent_id_filter IS NULL
      OR (m.agent_id = agent_id_filter)
      OR (include_shared AND m.visibility = 'shared')
      OR (m.agent_id = 'global')
    )
  ORDER BY
    m.is_pinned DESC,
    (1 - (m.embedding <=> query_embedding)) * m.confidence_score * m.importance_score DESC
  LIMIT match_count;
END;
$$;

-- ============================================
-- Feature 5: Retain Strategies
-- Add strategy configuration to pipeline config
-- ============================================

ALTER TABLE public.memory_pipeline_config
  ADD COLUMN IF NOT EXISTS default_retain_strategy TEXT DEFAULT 'atomic_facts';

-- ============================================
-- Feature 1: Mental Models & Reflect Pipeline
-- ============================================

CREATE TABLE IF NOT EXISTS public.mental_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  model_type TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  current_content TEXT,
  trigger_config JSONB DEFAULT '{"min_new_observations": 5}'::jsonb,
  source_memory_ids UUID[] DEFAULT '{}',
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  last_reflected_at TIMESTAMPTZ,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mental_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage mental models"
  ON public.mental_models FOR ALL
  TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE INDEX IF NOT EXISTS idx_mental_models_ws
  ON public.mental_models (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_mental_models_embedding
  ON public.mental_models USING hnsw (embedding vector_cosine_ops);

-- Mental model version history
CREATE TABLE IF NOT EXISTS public.mental_model_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.mental_models(id) ON DELETE CASCADE,
  version INT NOT NULL,
  content TEXT NOT NULL,
  diff_summary TEXT,
  source_memory_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mental_model_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view mental model history"
  ON public.mental_model_history FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mental_models mm
    WHERE mm.id = model_id AND public.is_workspace_member(mm.workspace_id)
  ));

CREATE INDEX IF NOT EXISTS idx_mental_model_history_model
  ON public.mental_model_history (model_id, version DESC);

-- Add observation_scope to assistant_memory
ALTER TABLE public.assistant_memory
  ADD COLUMN IF NOT EXISTS observation_scope TEXT DEFAULT 'raw';

-- ============================================
-- Feature 6: Memory Webhooks & Event System
-- ============================================

CREATE TABLE IF NOT EXISTS public.memory_webhook_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  event_types TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.memory_webhook_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage webhook configs"
  ON public.memory_webhook_config FOR ALL
  TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE INDEX IF NOT EXISTS idx_memory_webhook_config_ws
  ON public.memory_webhook_config (workspace_id, is_active);

CREATE TABLE IF NOT EXISTS public.memory_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  webhook_config_id UUID REFERENCES public.memory_webhook_config(id) ON DELETE SET NULL,
  delivery_status TEXT DEFAULT 'pending',
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.memory_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view memory events"
  ON public.memory_events FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE INDEX IF NOT EXISTS idx_memory_events_ws_type
  ON public.memory_events (workspace_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_events_delivery
  ON public.memory_events (delivery_status, created_at)
  WHERE delivery_status = 'pending';

-- ============================================
-- Feature 7: Context-Aware Memory Routing
-- Entity aliases for automatic entity resolution
-- ============================================

CREATE TABLE IF NOT EXISTS public.entity_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.entity_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage entity aliases"
  ON public.entity_aliases FOR ALL
  TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE INDEX IF NOT EXISTS idx_entity_aliases_ws_alias
  ON public.entity_aliases (workspace_id, lower(alias));

-- ============================================
-- Feature 8: Memory Templates
-- ============================================

CREATE TABLE IF NOT EXISTS public.memory_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  manifest JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT false,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.memory_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public templates"
  ON public.memory_templates FOR SELECT
  TO authenticated
  USING (is_public OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id)));

CREATE POLICY "Workspace members can manage their templates"
  ON public.memory_templates FOR ALL
  TO authenticated
  USING (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
  WITH CHECK (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id));

-- ============================================
-- Feature 9: Audit Log & Observability
-- ============================================

CREATE TABLE IF NOT EXISTS public.memory_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id TEXT,
  request_duration_ms INT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.memory_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view audit logs"
  ON public.memory_audit_log FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "System can insert audit logs"
  ON public.memory_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE INDEX IF NOT EXISTS idx_memory_audit_log_ws_action
  ON public.memory_audit_log (workspace_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_audit_log_target
  ON public.memory_audit_log (target_type, target_id, created_at DESC);

-- ============================================
-- Feature 4: Document Ingestion Status
-- ============================================

CREATE TABLE IF NOT EXISTS public.document_ingestion_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  attachment_id UUID REFERENCES public.memory_attachments(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  total_chunks INT DEFAULT 0,
  processed_chunks INT DEFAULT 0,
  memories_created INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_ingestion_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view ingestion status"
  ON public.document_ingestion_status FOR ALL
  TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE INDEX IF NOT EXISTS idx_doc_ingestion_ws_status
  ON public.document_ingestion_status (workspace_id, status);
