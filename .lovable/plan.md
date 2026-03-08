

## Multi-Agent System Overhaul — OpenClaw-Inspired Architecture

### Current State Assessment

The existing multi-agent system has the right bones but several critical gaps:

1. **Broken embeddings**: The `agent-orchestrator` and `assistant-chat` edge functions call `getEmbedding()` which requires `OPENAI_API_KEY` — this secret does **not exist** in the project. Memory search and save_insight silently fail.
2. **No proactive memory saving**: Agents can `save_insight` but the system prompt doesn't aggressively instruct them to do so. There's no pre-compaction flush or automatic memory capture.
3. **Agents don't read memories on boot**: The orchestrator fetches 5 memories via hybrid search but doesn't load curated MEMORY entries (the equivalent of OpenClaw's MEMORY.md).
4. **No SOUL/identity layer**: There's no persistent persona or workspace-level identity document that shapes agent behavior consistently.
5. **Chat assistant lacks data query tools**: The `assistant-chat` function only has memory/log/snapshot tools plus `delegate_to_agent`. It can't directly query YouTube stats, CRM, revenue, etc. — it must delegate for everything.
6. **No automatic memory flush**: When context fills up, nothing triggers a save-before-forget cycle.

### Plan — OpenClaw-Inspired Improvements

#### 1. Fix Embeddings — Switch to Lovable AI Gateway

Replace all `getEmbedding()` calls that use `OPENAI_API_KEY` with the Lovable AI Gateway, which is already available. Use Gemini's embedding endpoint or switch to tool-calling-based memory extraction instead of raw embeddings.

**Alternative**: Add the OPENAI_API_KEY secret. But since it's missing and the Lovable AI Gateway is available, we should use what's already configured.

**Decision needed**: The hybrid_memory_search RPC function uses `vector <=> embedding` which requires actual embeddings. We need either:
- (A) Add an OPENAI_API_KEY secret for embeddings
- (B) Use the Lovable AI Gateway to generate embeddings via a compatible endpoint
- (C) Fall back to pure text search when embeddings aren't available

#### 2. Add Workspace Identity Layer (SOUL.md equivalent)

Create a `workspace_identity` table to store per-workspace persona and context documents:

```sql
CREATE TABLE workspace_identity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  document_type text NOT NULL, -- 'soul', 'user_profile', 'agent_instructions'
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, document_type)
);
```

This gives agents a consistent cognitive baseline — the equivalent of SOUL.md, USER.md, and AGENTS.md loaded every session.

#### 3. Give Chat Assistant Direct Data Query Tools

Merge the agent-orchestrator's 10 data-query tools into `assistant-chat` so the assistant can directly query YouTube stats, CRM, revenue, comments, experiments, etc. without needing to delegate for basic data lookups. Delegation should be reserved for deep multi-step analysis.

Tools to add to `assistant-chat`:
- `query_youtube_stats`
- `query_crm_data`
- `query_revenue_data`
- `query_comments`
- `query_growth_goals`
- `query_content_pipeline`
- `query_all_video_analytics`
- `create_proposal` (so the chat assistant can directly create actionable proposals)

#### 4. Enhance System Prompts with OpenClaw Principles

Update both `assistant-chat` and `agent-orchestrator` system prompts to follow OpenClaw's behavioral rules:

- **Act before asking**: Query data proactively, don't ask the user what to look up
- **Save aggressively**: After every significant analysis, save insights to long-term memory
- **Memory is existence**: Always search memory before answering contextual questions
- **Have opinions**: Give decisive recommendations, not wishy-washy options
- **Boot sequence**: Load workspace identity docs + recent memories + today/yesterday logs before every interaction

#### 5. Add Pre-Compaction Memory Flush

When the conversation history approaches the context limit (tracked by message count in a session), automatically inject a "save important context now" system message. This prevents memory loss during long sessions.

Implementation: In the tool-call loop of `assistant-chat`, check if `history.length > 16` and inject a flush prompt instructing the model to `save_memory` for anything important before older messages get truncated.

#### 6. Enhance Agent Memory Persistence

After each agent execution completes, automatically save a summary of findings and actions to long-term memory with appropriate tags. Currently agents CAN save insights via `save_insight` but aren't strongly instructed to. The system prompt update (item 4) addresses this, but we also add an automatic post-run summary save.

### Files to Edit

| File | Change |
|------|--------|
| `supabase/functions/assistant-chat/index.ts` | Add data query tools, workspace identity loading, flush logic, enhanced system prompt |
| `supabase/functions/agent-orchestrator/index.ts` | Add workspace identity loading, enhanced system prompt, post-run memory save |
| New migration | Create `workspace_identity` table with RLS |
| `src/integrations/supabase/types.ts` | Auto-updated after migration |

### Embedding Strategy Decision

The current `hybrid_memory_search` RPC function requires vector embeddings. Since `OPENAI_API_KEY` is not configured, we have two paths:

- **Quick fix**: Use the Lovable AI Gateway to call an embedding-compatible model, or fall back to pure text search (disable the vector component, use only full-text search at 100% weight)
- **Proper fix**: Ask the user to add an OpenAI API key, or switch the embedding generation to use the Lovable AI Gateway

The plan will implement a graceful fallback: try embeddings via Lovable AI Gateway, fall back to text-only search if unavailable.

