-- ============================================
-- WORKSPACE INTEGRATIONS
-- Stores per-workspace integration connection status and credentials
-- ============================================

CREATE TABLE public.workspace_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  integration_key TEXT NOT NULL,   -- e.g. 'ms_outlook', 'firecrawl', 'twitter'
  enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB DEFAULT '{}'::jsonb, -- stores masked credentials and settings
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, integration_key)
);

CREATE INDEX idx_workspace_integrations_ws ON public.workspace_integrations(workspace_id);

-- Updated_at trigger
CREATE TRIGGER trg_workspace_integrations_updated
  BEFORE UPDATE ON public.workspace_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.workspace_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace integrations"
  ON public.workspace_integrations FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Admins can insert integrations"
  ON public.workspace_integrations FOR INSERT
  WITH CHECK (public.get_workspace_role(workspace_id) = 'admin');

CREATE POLICY "Admins can update integrations"
  ON public.workspace_integrations FOR UPDATE
  USING (public.get_workspace_role(workspace_id) = 'admin');

CREATE POLICY "Admins can delete integrations"
  ON public.workspace_integrations FOR DELETE
  USING (public.get_workspace_role(workspace_id) = 'admin');
