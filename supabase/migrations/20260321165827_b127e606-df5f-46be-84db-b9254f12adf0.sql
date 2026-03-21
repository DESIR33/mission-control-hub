
-- Table to track per-dataset, per-workspace sync freshness
CREATE TABLE public.dataset_sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  dataset_key text NOT NULL,
  last_successful_sync_at timestamptz,
  next_eligible_sync_at timestamptz,
  last_sync_triggered_by text, -- 'cron' | 'manual' | 'webhook'
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, dataset_key)
);

ALTER TABLE public.dataset_sync_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view sync status"
  ON public.dataset_sync_status
  FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can upsert sync status"
  ON public.dataset_sync_status
  FOR ALL
  TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Trigger for updated_at
CREATE TRIGGER update_dataset_sync_status_updated_at
  BEFORE UPDATE ON public.dataset_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function for edge functions to stamp sync completion with cooldown
CREATE OR REPLACE FUNCTION public.record_dataset_sync(
  p_workspace_id uuid,
  p_dataset_key text,
  p_triggered_by text DEFAULT 'cron',
  p_cooldown_hours int DEFAULT 24,
  p_error text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  INSERT INTO dataset_sync_status (workspace_id, dataset_key, last_successful_sync_at, next_eligible_sync_at, last_sync_triggered_by, last_error)
  VALUES (
    p_workspace_id,
    p_dataset_key,
    CASE WHEN p_error IS NULL THEN now() ELSE NULL END,
    now() + (p_cooldown_hours || ' hours')::interval,
    p_triggered_by,
    p_error
  )
  ON CONFLICT (workspace_id, dataset_key) DO UPDATE SET
    last_successful_sync_at = CASE WHEN p_error IS NULL THEN now() ELSE dataset_sync_status.last_successful_sync_at END,
    next_eligible_sync_at = now() + (p_cooldown_hours || ' hours')::interval,
    last_sync_triggered_by = p_triggered_by,
    last_error = p_error,
    updated_at = now();

  SELECT jsonb_build_object(
    'dataset_key', p_dataset_key,
    'last_successful_sync_at', ds.last_successful_sync_at,
    'next_eligible_sync_at', ds.next_eligible_sync_at
  ) INTO result
  FROM dataset_sync_status ds
  WHERE ds.workspace_id = p_workspace_id AND ds.dataset_key = p_dataset_key;

  RETURN result;
END;
$$;

-- Function to check if a manual refresh is allowed (cooldown check)
CREATE OR REPLACE FUNCTION public.can_manual_refresh(
  p_workspace_id uuid,
  p_dataset_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM dataset_sync_status
    WHERE workspace_id = p_workspace_id
      AND dataset_key = p_dataset_key
      AND next_eligible_sync_at > now()
  );
$$;
