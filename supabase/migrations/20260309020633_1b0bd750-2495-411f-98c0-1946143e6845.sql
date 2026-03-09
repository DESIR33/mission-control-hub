
-- Inbox feedback table for ConversationIntelligence and FollowUpRadar
CREATE TABLE public.inbox_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL,
  feedback_type TEXT NOT NULL DEFAULT 'irrelevant',
  source TEXT NOT NULL DEFAULT 'conversation_intelligence',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email_address, source)
);

ALTER TABLE public.inbox_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage inbox_feedback"
  ON public.inbox_feedback FOR ALL
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

-- Enable realtime on inbox_emails for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_emails;
