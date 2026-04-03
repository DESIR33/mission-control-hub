
CREATE TABLE public.integration_token_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  integration_key text NOT NULL,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('healthy', 'degraded', 'expired', 'unknown')),
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  last_healthy_at timestamptz,
  error_message text,
  expires_in_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, integration_key)
);

ALTER TABLE public.integration_token_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own workspace token health"
  ON public.integration_token_health FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Service role can manage token health"
  ON public.integration_token_health FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_integration_token_health_updated_at
  BEFORE UPDATE ON public.integration_token_health
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
