-- inbox_review_queue for low-confidence automated actions needing manual review
CREATE TABLE IF NOT EXISTS public.inbox_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email_id uuid NOT NULL,
  review_type text NOT NULL DEFAULT 'affiliate_transaction',
  status text NOT NULL DEFAULT 'pending',
  confidence integer NOT NULL DEFAULT 0,
  extracted_data jsonb NOT NULL DEFAULT '{}',
  suggested_matches jsonb NOT NULL DEFAULT '[]',
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inbox_review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can view review queue"
  ON public.inbox_review_queue FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace members can update review queue"
  ON public.inbox_review_queue FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "service can insert review queue"
  ON public.inbox_review_queue FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE INDEX idx_inbox_review_queue_workspace_status
  ON public.inbox_review_queue(workspace_id, status);