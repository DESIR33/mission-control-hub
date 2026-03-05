
create extension if not exists vector with schema extensions;

create table public.assistant_daily_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  log_date date not null default current_date,
  source text not null default 'chat',
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.assistant_daily_logs enable row level security;
create policy "Members can manage daily_logs" on public.assistant_daily_logs
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create index idx_daily_logs_ws_date on public.assistant_daily_logs (workspace_id, log_date desc);

create table public.assistant_memory (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content text not null,
  origin text not null default 'manual',
  tags text[] default '{}',
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.assistant_memory enable row level security;
create policy "Members can manage memory" on public.assistant_memory
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create index idx_memory_fts on public.assistant_memory using gin(to_tsvector('english', content));
create index idx_memory_ws_origin on public.assistant_memory (workspace_id, origin);

create table public.assistant_service_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  service text not null,
  summary text not null,
  raw_data jsonb,
  snapshot_date date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.assistant_service_snapshots enable row level security;
create policy "Members can manage snapshots" on public.assistant_service_snapshots
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create index idx_snapshots_latest on public.assistant_service_snapshots (workspace_id, service, snapshot_date desc);

create table public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  session_id uuid not null,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text not null,
  tool_name text,
  tool_result jsonb,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);
alter table public.assistant_conversations enable row level security;
create policy "Members can manage conversations" on public.assistant_conversations
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create index idx_conversations_session on public.assistant_conversations (session_id, created_at);
create index idx_conversations_ws on public.assistant_conversations (workspace_id, created_at desc);

create or replace function public.hybrid_memory_search(
  query_embedding text,
  query_text text,
  ws_id uuid,
  origin_filter text default 'any',
  match_count int default 5
) returns table (
  id uuid,
  content text,
  origin text,
  tags text[],
  rrf_score float8
) language plpgsql security definer set search_path = public as $$
declare
  k constant int := 60;
begin
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
end;
$$;
