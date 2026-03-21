-- Revoke SELECT on webhook_secret column from client-facing roles
-- The service role (used by edge functions) bypasses these grants
REVOKE SELECT (webhook_secret) ON public.workspaces FROM authenticated;
REVOKE SELECT (webhook_secret) ON public.workspaces FROM anon;