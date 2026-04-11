# Memory Features Analysis & Competitive Gap Assessment

## Overview

Analysis of the Mission Control Hub memory system against features from **Mem0**, **MemSync**, **Vectorize Hindsight**, and **Mempalace**. Identifies what's already built, what's partially implemented, and recommends 9 additional features to create the best all-in-one long-term memory solution for external LLMs.

---

## Current Feature Audit

### 1. Temporal Search Filtering — PARTIALLY BUILT

**What exists:**
- `valid_from`/`valid_until` timestamps on `assistant_memory` (migration `20260409000135`)
- Memory decay processor (`memory-decay-processor/index.ts`) with confidence decay, expiry detection, unused flagging
- Natural language date parsing in `AskAiSearch.tsx` for inbox search
- Date range filtering in CRM advanced filters

**Gaps:**
- `hybrid_memory_search` and `memory_vector_search` RPCs don't accept date range parameters
- No "what happened last week" temporal query parsing in the memory search path itself
- `AskAiSearch` component only works in inbox, not memory search

---

### 2. Memory Categorization Webhooks — PARTIALLY BUILT

**What exists:**
- DB triggers on deal stage changes and agent execution that invoke `auto-memory-extractor`
- `memory_pipeline_config` table with enable/disable controls per event type
- Subscriber webhook system for external notifications

**Gaps:**
- No outbound webhooks that fire when memories are categorized, tagged, or have lifecycle events
- Current triggers feed INTO memory creation, but nothing fires OUT when memory events occur

---

### 3. Graph Status in Events API — PARTIALLY BUILT

**What exists:**
- `memory_relationships` table with edge types (related_to, supports, contradicts, supersedes) and strength scores
- `get_memory_graph()` RPC function for recursive traversal
- `memory-graph-query` edge function
- `memory-linker` for automatic edge creation (entity-based, similarity-based, tag-based)

**Gaps:**
- No events API at all
- Graph operations have no status tracking or notification mechanism
- No way to know when graph linking completes for a given batch

---

### 4. Hybrid Memory Search — FULLY BUILT

**What exists:**
- `hybrid_memory_search()` RPC combining vector search (70% weight) and full-text search (30% weight) via Reciprocal Rank Fusion
- HNSW cosine index on embeddings + GIN tsvector index on content
- Conflict penalty (0.5x score multiplier for conflicted memories)
- Ranking formula: `0.7 / (vector_rank + 60) + 0.3 / (fts_rank + 60)`
- Origin filtering, workspace scoping, match count limiting
- Used by MCP server's `search_memory` tool
- **Location:** `supabase/migrations/20260410021229_*.sql`

---

### 5. Graph Memory Status Tracking — PARTIALLY BUILT

**What exists:**
- `memory_relationships` table with typed edges and strength scores
- `memory-health-stats` includes graph metrics (near-duplicate count, conflict breakdown)
- `memory-linker` creates edges automatically after ingestion

**Gaps:**
- No real-time operation status tracking
- No way to poll "is the graph done building for this batch?"
- No streaming status updates during graph operations

---

### 6. Specialist Agent System with Per-Agent Diaries — PARTIALLY BUILT

**What exists:**
- 5 specialist agents: competitor-analyst, content-strategist, growth-optimizer, audience-analyst, revenue-optimizer
- Per-agent learning preferences (`agent_learning_preferences`) with weighted positive/negative patterns
- Per-agent feedback (`agent_feedback`) tracking accepted/rejected/edited proposals
- Per-agent execution history with metrics (duration, proposals created)
- `agent_id` column on `assistant_memory` (migration `20260409095950`)
- `visibility` column on `assistant_memory` (defaults to `'private'`)
- Indexes on both columns already exist

**Gaps:**
- `agent_id` and `visibility` columns are **never used in any search query**
- `hybrid_memory_search` and `memory_vector_search` don't filter by agent
- MCP `save_memory` doesn't accept `agent_id` or `visibility` parameters
- All memories are effectively workspace-shared despite schema support for scoping

---

### 7. Room Detection from Folder Structure — NOT BUILT

**What exists:**
- Hierarchical `memory_folders` table with `parent_id` for nesting
- `memory_attachments` for file storage with mime type tracking
- Breadcrumb navigation in `MemoryFoldersTab.tsx`

**Gaps:**
- No automatic context detection from folder structure
- Folders are purely manual organization
- No concept of "rooms" that scope memory retrieval based on context

---

## Summary Table

| Feature | Source | Status | Effort to Complete |
|---|---|---|---|
| Hybrid Memory Search | Mem0 | **FULLY BUILT** | N/A |
| Temporal Search Filtering | Mem0 | Partially Built | Low — add params to existing RPCs |
| Memory Categorization Webhooks | Mem0 | Partially Built | Medium — new webhook system |
| Graph Status in Events API | Mem0 | Partially Built | Medium — new events layer |
| Graph Memory Status Tracking | MemSync | Partially Built | Medium — status tracking |
| Specialist Agent w/ Diaries | Mempalace | Partially Built | **Low — columns exist, just unused** |
| Room Detection from Folders | Mempalace | Not Built | Medium — new routing logic |

---

## 9 Recommended Additional Features

### Feature 1: Reflect & Consolidation Pipeline (Mental Models)

**Inspired by:** Hindsight's observations + mental models + reflect endpoint

**Description:** A multi-phase pipeline that promotes raw memories into higher-order knowledge structures. Raw memories accumulate as observations. A `reflect` process periodically synthesizes them into "mental models" — versioned knowledge representations like "How Company X makes purchasing decisions" or "Our audience's content preferences." Mental models track history with diff views and have configurable triggers.

**Why it matters:** This is Hindsight's biggest differentiator. Raw memories create an ever-growing pile that's hard for LLMs to navigate. Mental models give LLMs distilled, authoritative knowledge. The difference between searching through 500 scattered notes versus reading a concise "Audience Profile" that's kept up to date.

**Key components:**
- `mental_models` table (id, workspace_id, name, model_type, current_content, trigger_config, version)
- `mental_model_history` table (version tracking with diffs)
- `reflect` edge function that gathers related memories and uses LLM to synthesize
- `observation_scope` column on `assistant_memory` to differentiate raw facts from synthesized outputs
- MCP tool: `reflect_memory`

**Builds on:** Existing `cluster-memories` and `merge-memories` pattern, `memory_relationships` with `derived_from` edges

---

### Feature 2: Multi-Framework Integration SDK Layer

**Inspired by:** Hindsight's 12+ framework integrations (LangGraph, CrewAI, PydanticAI, AutoGen, AI SDK, etc.)

**Description:** Thin adapter packages that let popular LLM frameworks use MCH as their long-term memory backend. Each adapter wraps the existing REST API and MCP server into framework-idiomatic interfaces.

**Why it matters:** The current system has only 2 integration points: REST `memory-ingest` and MCP server with 4 tools. For developers building with LangGraph or CrewAI, manually wiring HTTP calls is a significant adoption barrier. Framework-native adapters ("plug in MCH memory in one line") dramatically lower the bar.

**Key components:**
- Core `@mch/memory-client` TypeScript/Python client
- `@mch/langchain` — implements LangChain's `BaseMemory` interface
- `@mch/ai-sdk` — Vercel AI SDK middleware for auto memory injection/extraction
- `@mch/crewai` — CrewAI Memory tool class
- All packages consume existing endpoints — no new server-side code initially

---

### Feature 3: Agent Memory Scopes (Per-Agent Diaries)

**Inspired by:** Mempalace's per-agent diaries, Hindsight's observation scopes

**Description:** Transform the workspace-shared memory model into a scoped architecture where each specialist agent has its own private memory space ("diary") while still reading shared workspace memories. Agents can write to their diary, promote entries to shared visibility, and optionally read other agents' diaries.

**Why it matters:** The `agent_id` and `visibility` columns already exist on `assistant_memory` but are completely unused. All 5 specialist agents retrieve all workspace memories regardless of relevance — noise in context windows.

**Key components:**
- Modify `hybrid_memory_search` RPC to accept `agent_id_filter` with visibility-aware WHERE clause
- Update MCP `save_memory` to accept `agent_id` and `visibility` parameters
- New MCP tools: `promote_memory` (private to shared), `get_agent_diary`
- Frontend: agent scope filter on `LongTermMemoryTab` and `MemoryGraphView`

**Effort:** LOW — schema already exists, just needs query changes

---

### Feature 4: Document Ingestion Pipeline

**Inspired by:** Hindsight's Iris file parser, PDF/image/Office doc ingestion

**Description:** Extract text and knowledge from uploaded files (PDF, images with OCR, DOCX, PPTX, XLSX, Markdown, CSV) and convert them into searchable memories. Uploaded documents are parsed, chunked, embedded, and stored as memories with source provenance.

**Why it matters:** The `memory_attachments` table and storage bucket exist, but uploading a file does nothing beyond storing it — no extraction, no embedding, no searchability. Much organizational knowledge lives in documents.

**Key components:**
- `document-ingest` edge function with mime-type-based parsing
- Chunking: 500-token default with 50-token overlap
- Per-chunk embedding + dedup check (>0.95 threshold)
- `document_ingestion_status` table for tracking
- Auto-trigger on `uploadFile` mutation
- MCP tool: `ingest_document`

---

### Feature 5: Retain Strategies (Configurable Extraction Modes)

**Inspired by:** Hindsight's verbatim, chunks, delta, and append retain strategies

**Description:** Pluggable memory extraction strategies that determine HOW content gets converted into memories. Rather than one-size-fits-all LLM extraction, support multiple modes: verbatim (store exact text), chunks (fixed-size splits), delta (only what's new), summary (LLM-generated), atomic facts (current behavior), and append (add to existing memory).

**Why it matters:** Current extraction always uses LLM-based atomic fact extraction. This is wrong for verbatim code snippets, pricing tables, or step-by-step procedures where LLM summarization loses critical detail.

**Key components:**
- `strategy` parameter on `memory-ingest` endpoint
- Strategy implementations in `_shared/retain-strategies.ts`
- `strategy` parameter on MCP `save_memory` tool
- `retain_strategy` field on `memory_pipeline_config`

---

### Feature 6: Memory Webhooks & Event System

**Inspired by:** Mem0's categorization webhooks, Hindsight's consolidation/retain event webhooks

**Description:** Fire notifications when significant memory lifecycle events occur: memory created, conflict detected, conflict resolved, memory promoted, mental model updated, decay threshold crossed, batch ingestion completed. Supports external webhook URLs and internal event chaining.

**Why it matters:** Current triggers feed INTO memory creation but nothing fires OUT. External systems must poll instead of react. Webhooks enable patterns like "when a conflict is detected about pricing, notify the sales team."

**Key components:**
- `memory_webhook_config` table (url, event_types[], secret, is_active)
- `memory_events` table (event log and delivery queue)
- `memory-webhook-dispatcher` edge function with HMAC-signed payloads
- DB triggers on `assistant_memory` and `memory_conflicts`
- Internal event chaining via `memory_pipeline_config` `on_event` triggers

---

### Feature 7: Context-Aware Memory Routing

**Inspired by:** Mempalace's room detection, Hindsight's observation scopes

**Description:** An intelligent routing layer that automatically determines which memories are relevant for a given context. Analyzes the current conversation context, active project/entity, agent identity, and time context to construct an optimal retrieval query. Includes automatic entity detection and a "memory briefing" that proactively assembles relevant memories before an agent starts work.

**Why it matters:** Current retrieval requires explicit search queries. LLMs often search for the wrong thing or forget to search at all. Context-aware routing shifts the burden — the system proactively surfaces relevant memories.

**Key components:**
- `memory-context-router` edge function combining multiple retrieval strategies
- `entity_aliases` table mapping informal references to entity IDs
- MCP tool: `get_context_brief` — primary retrieval tool for agents
- Auto-injection into `assistant-chat` sessions

**Builds on:** Existing `entity_type`/`entity_id`, `folder_id`, `agent_id`, `is_pinned` columns

---

### Feature 8: Memory Templates & Workspace Snapshots

**Inspired by:** Hindsight's bank template import/export with Template Hub

**Description:** Package memory configurations (folder structure, pipeline configs, mental model definitions, agent scopes, webhook configs) as portable templates for export, sharing, and import into new workspaces. Also supports full workspace memory snapshots for backup/migration.

**Why it matters:** When using MCH across multiple workspaces, replicating configuration manually is error-prone. Templates enable a marketplace model: share your "Content Creator Memory Setup" with others.

**Key components:**
- `memory_templates` table (name, manifest_json, is_public)
- `memory-template-export/import` edge functions
- `memory-snapshot-export/import` edge functions for full data backup
- MCP tools: `export_memory_snapshot`, `import_memory_template`

---

### Feature 9: Audit Log & Observability Layer

**Inspired by:** Hindsight's audit logging, OpenTelemetry tracing

**Description:** A comprehensive audit trail recording every memory system operation with timing, authorship, and provenance. Combined with request-level timing metrics for search latency, ingestion throughput, and embedding generation time.

**Why it matters:** Current system has `memory_access_log` for reads and `api_key_usage_log` for rate limiting, but no audit trail for writes/updates/deletes, no operation timing, and no provenance tracking. Operators can't answer "Why does the system think our pricing is $X?" or "Which agent created the most memories this week?"

**Key components:**
- `memory_audit_log` table (action, target, actor, duration_ms, metadata)
- Shared `_shared/audit.ts` helper wrapping operations with timing
- `memory_operation_metrics` materialized view for aggregated analytics
- `memory-audit-query` edge function
- Provenance chain traversal for any memory
- MCP resource: `memory://audit/{memory_id}`

---

## Implementation Roadmap

### Phase 1: Foundation (Low effort, high impact)
- **Feature 3:** Agent Memory Scopes — add WHERE clause to 2 SQL RPCs, parameters to MCP server
- **Feature 5:** Retain Strategies — add routing logic to `memory-ingest`, shared strategy module

### Phase 2: Core Differentiators (The moat)
- **Feature 1:** Reflect & Consolidation Pipeline — new tables, edge function, MCP tool
- **Feature 7:** Context-Aware Memory Routing — new edge function composing existing primitives

### Phase 3: Integration & Adoption (Expand surface area)
- **Feature 2:** Multi-Framework SDKs — client packages for major LLM frameworks
- **Feature 4:** Document Ingestion — parsing, chunking, embedding pipeline

### Phase 4: Platform & Enterprise (Maturity)
- **Feature 6:** Memory Webhooks & Event System
- **Feature 8:** Memory Templates & Workspace Snapshots
- **Feature 9:** Audit Log & Observability Layer

---

## Key Architecture Files

| File | Role |
|---|---|
| `supabase/functions/mcp-memory-server/index.ts` | MCP server (4 tools + 1 resource) |
| `supabase/functions/memory-ingest/index.ts` | REST API for batch memory ingestion |
| `supabase/functions/memory-graph-query/index.ts` | Graph traversal endpoint |
| `supabase/functions/memory-linker/index.ts` | Automatic graph edge creation |
| `supabase/functions/memory-conflict-detector/index.ts` | AI-powered conflict classification |
| `supabase/functions/memory-decay-processor/index.ts` | Confidence decay + stale detection |
| `supabase/functions/memory-health-stats/index.ts` | Analytics and health metrics |
| `supabase/functions/auto-memory-extractor/index.ts` | Event-driven memory extraction |
| `supabase/functions/_shared/api-key-auth.ts` | Shared API key authentication |
| `supabase/migrations/20260409000135_*.sql` | Core `assistant_memory` schema |
| `supabase/migrations/20260410021229_*.sql` | `hybrid_memory_search` RPC |
| `supabase/migrations/20260409095950_*.sql` | `agent_id` + `visibility` columns (unused) |
| `src/hooks/use-assistant-memory.ts` | Frontend memory CRUD + search hook |
| `src/components/memory/LongTermMemoryTab.tsx` | Memory search UI |
