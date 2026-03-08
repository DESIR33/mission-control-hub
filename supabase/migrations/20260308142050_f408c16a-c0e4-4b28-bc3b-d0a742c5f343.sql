
-- Create inbox_emails table for storing synced emails
CREATE TABLE public.inbox_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  message_id text NOT NULL,
  conversation_id text,
  from_email text NOT NULL DEFAULT '',
  from_name text NOT NULL DEFAULT '',
  to_recipients jsonb DEFAULT '[]'::jsonb,
  subject text NOT NULL DEFAULT '',
  preview text NOT NULL DEFAULT '',
  body_html text,
  received_at timestamptz NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  importance text NOT NULL DEFAULT 'normal',
  has_attachments boolean NOT NULL DEFAULT false,
  folder text NOT NULL DEFAULT 'inbox',
  labels text[] DEFAULT '{}'::text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, message_id)
);

-- RLS policies
ALTER TABLE public.inbox_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view inbox_emails"
  ON public.inbox_emails FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can insert inbox_emails"
  ON public.inbox_emails FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can update inbox_emails"
  ON public.inbox_emails FOR UPDATE
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can delete inbox_emails"
  ON public.inbox_emails FOR DELETE
  TO authenticated
  USING (is_workspace_member(workspace_id));

-- Index for common queries
CREATE INDEX idx_inbox_emails_workspace_folder ON public.inbox_emails(workspace_id, folder);
CREATE INDEX idx_inbox_emails_workspace_received ON public.inbox_emails(workspace_id, received_at DESC);

-- Updated_at trigger
CREATE TRIGGER set_inbox_emails_updated_at
  BEFORE UPDATE ON public.inbox_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
