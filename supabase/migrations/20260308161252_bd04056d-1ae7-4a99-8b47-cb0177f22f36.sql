
-- Create workspace_identity table for SOUL/persona documents
CREATE TABLE public.workspace_identity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, document_type)
);

-- Enable RLS
ALTER TABLE public.workspace_identity ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Members can view workspace_identity"
  ON public.workspace_identity FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Admins can manage workspace_identity"
  ON public.workspace_identity FOR ALL
  USING (get_workspace_role(workspace_id) = 'admin')
  WITH CHECK (get_workspace_role(workspace_id) = 'admin');

-- Update hybrid_memory_search to gracefully handle null embeddings (text-only fallback)
CREATE OR REPLACE FUNCTION public.hybrid_memory_search(
  query_embedding text,
  query_text text,
  ws_id uuid,
  origin_filter text DEFAULT 'any',
  match_count integer DEFAULT 5
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
  -- Check if embedding is a valid non-empty value
  has_embedding := query_embedding IS NOT NULL 
    AND query_embedding != '' 
    AND query_embedding != '[]'
    AND length(query_embedding) > 10;

  IF has_embedding THEN
    -- Full hybrid search with both vector and text
    return query
    with vector_results as (
      select m.id, row_number() over (order by m.embedding <=> query_embedding::vector) as vrank
      from assistant_memory m
      where m.workspace_id = ws_id
        and (origin_filter = 'any' or m.origin = origin_filter)
        and m.embedding is not null
      order by m.embedding <=> query_embedding::vector
      limit 20
    ),
    fts_results as (
      select m.id, row_number() over (order by ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', query_text)) desc) as frank
      from assistant_memory m
      where m.workspace_id = ws_id
        and (origin_filter = 'any' or m.origin = origin_filter)
        and query_text is not null and query_text != ''
        and to_tsvector('english', m.content) @@ plainto_tsquery('english', query_text)
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
    -- Text-only fallback when no embedding available
    return query
    select m.id, m.content, m.origin, m.tags, 
           ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', query_text))::double precision as rrf_score
    from assistant_memory m
    where m.workspace_id = ws_id
      and (origin_filter = 'any' or m.origin = origin_filter)
      and query_text is not null and query_text != ''
      and to_tsvector('english', m.content) @@ plainto_tsquery('english', query_text)
    order by rrf_score desc
    limit match_count;
  END IF;
end;
$$;
