
-- Queue for webhook-triggered incremental syncs
CREATE TABLE public.webhook_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL,  -- 'new_video' | 'video_updated' | 'video_deleted'
  entity_id text NOT NULL,   -- youtube video id or channel id
  payload jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',  -- pending | processing | done | failed
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'done', 'failed'))
);

ALTER TABLE public.webhook_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view sync queue"
  ON public.webhook_sync_queue
  FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- Index for processing pending items
CREATE INDEX idx_webhook_sync_queue_pending
  ON public.webhook_sync_queue (status, created_at)
  WHERE status = 'pending';

-- Index for dedup lookups
CREATE INDEX idx_webhook_sync_queue_dedup
  ON public.webhook_sync_queue (workspace_id, entity_id, event_type)
  WHERE status IN ('pending', 'processing');

-- Enable realtime for UI cache invalidation
ALTER PUBLICATION supabase_realtime ADD TABLE public.webhook_sync_queue;
