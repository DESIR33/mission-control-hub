
-- Knowledge Base entries for workspace AI context
CREATE TABLE public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can manage knowledge base" ON public.knowledge_base FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- Custom auto-label rules
CREATE TABLE public.email_auto_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  label_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  natural_language_rule TEXT NOT NULL,
  color TEXT DEFAULT 'gray',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_auto_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can manage auto labels" ON public.email_auto_labels FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- Muted conversations
CREATE TABLE public.muted_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id TEXT,
  from_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, conversation_id),
  UNIQUE(workspace_id, from_email)
);
ALTER TABLE public.muted_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can manage muted conversations" ON public.muted_conversations FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- Email internal comments (team collaboration)
CREATE TABLE public.email_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can manage email comments" ON public.email_comments FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- Shared drafts
CREATE TABLE public.shared_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email_id UUID,
  created_by UUID NOT NULL,
  to_email TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  shared_with UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shared_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can manage shared drafts" ON public.shared_drafts FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- Auto BCC rules
CREATE TABLE public.auto_bcc_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  bcc_email TEXT NOT NULL,
  condition_type TEXT NOT NULL DEFAULT 'always',
  condition_value TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.auto_bcc_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can manage auto bcc rules" ON public.auto_bcc_rules FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- Add is_muted column to inbox_emails for quick filtering
ALTER TABLE public.inbox_emails ADD COLUMN IF NOT EXISTS is_muted BOOLEAN NOT NULL DEFAULT false;
