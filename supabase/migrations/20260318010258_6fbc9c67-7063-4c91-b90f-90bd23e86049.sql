-- Revoke direct SELECT on config column from anon and authenticated roles
-- This forces clients to use the integration-config-read edge function which masks secrets
REVOKE ALL ON public.workspace_integrations FROM anon, authenticated;
GRANT SELECT (id, workspace_id, integration_key, enabled, connected_at, created_at, updated_at) ON public.workspace_integrations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.workspace_integrations TO authenticated;