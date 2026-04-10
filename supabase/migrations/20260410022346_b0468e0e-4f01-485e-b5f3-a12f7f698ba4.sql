-- Track which chat sessions have had memories extracted
CREATE TABLE public.conversation_extraction_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  message_count INTEGER NOT NULL DEFAULT 0,
  memories_extracted INTEGER NOT NULL DEFAULT 0,
  skipped_reason TEXT,
  model_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

ALTER TABLE public.conversation_extraction_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view extraction logs"
  ON public.conversation_extraction_log
  FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Service role can insert extraction logs"
  ON public.conversation_extraction_log
  FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_conversation_extraction_log_workspace
  ON public.conversation_extraction_log(workspace_id);

CREATE INDEX idx_conversation_extraction_log_session
  ON public.conversation_extraction_log(session_id);