
CREATE OR REPLACE FUNCTION public.hybrid_memory_search(
  query_embedding text,
  query_text text,
  ws_id uuid,
  origin_filter text DEFAULT 'any'::text,
  match_count integer DEFAULT 10,
  search_offset integer DEFAULT 0
)
RETURNS TABLE(id uuid, content text, origin text, tags text[], rrf_score double precision)
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
           f.score * (case when ci.mid is not null then 0.5 else 1.0 end) as rrf_score
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
             * (case when ci.mid is not null then 0.5 else 1.0 end) as rrf_score
    from assistant_memory m
    left join conflicted_ids ci on ci.mid = m.id
    where m.workspace_id = ws_id
      and m.status = 'active'
      and m.review_status = 'approved'
      and (origin_filter = 'any' or m.origin = origin_filter)
      and query_text is not null and query_text != ''
      and to_tsvector('english', m.content) @@ plainto_tsquery('english', query_text)
    order by rrf_score desc
    limit match_count
    offset search_offset;
  END IF;
end;
$function$;
