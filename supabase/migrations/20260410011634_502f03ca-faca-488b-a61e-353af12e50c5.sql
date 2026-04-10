
-- API Keys table for external memory ingestion authentication
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Unnamed Key',
  permissions TEXT[] NOT NULL DEFAULT ARRAY['memory:write'],
  rate_limit_per_minute INT NOT NULL DEFAULT 60,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast key lookup during auth
CREATE UNIQUE INDEX idx_api_keys_key_hash ON public.api_keys (key_hash);
CREATE INDEX idx_api_keys_workspace ON public.api_keys (workspace_id);

-- RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view api keys"
  ON public.api_keys FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Admins and operators can insert api keys"
  ON public.api_keys FOR INSERT
  TO authenticated
  WITH CHECK (
    get_workspace_role(workspace_id) IN ('admin', 'operator')
  );

CREATE POLICY "Admins and operators can update api keys"
  ON public.api_keys FOR UPDATE
  TO authenticated
  USING (get_workspace_role(workspace_id) IN ('admin', 'operator'));

CREATE POLICY "Admins can delete api keys"
  ON public.api_keys FOR DELETE
  TO authenticated
  USING (get_workspace_role(workspace_id) = 'admin');

-- Updated_at trigger
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Rate limiting tracking table
CREATE TABLE public.api_key_usage_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  request_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_key_usage_window ON public.api_key_usage_log (api_key_id, window_start);

ALTER TABLE public.api_key_usage_log ENABLE ROW LEVEL SECURITY;

-- Only service role should access usage logs (edge functions use service role)
-- No authenticated user policies needed
