-- Add scoping columns to assistant_memory
ALTER TABLE public.assistant_memory
  ADD COLUMN IF NOT EXISTS agent_id text NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_assistant_memory_agent_id ON public.assistant_memory (agent_id);
CREATE INDEX IF NOT EXISTS idx_assistant_memory_visibility ON public.assistant_memory (visibility);
CREATE INDEX IF NOT EXISTS idx_assistant_memory_status ON public.assistant_memory (status);