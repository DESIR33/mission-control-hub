
-- Create workspace_features table
CREATE TABLE public.workspace_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, feature_key)
);

-- Enable RLS
ALTER TABLE public.workspace_features ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Workspace members can view features"
ON public.workspace_features FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Admins and operators can update features"
ON public.workspace_features FOR UPDATE
TO authenticated
USING (public.get_workspace_role(workspace_id) IN ('admin', 'operator'))
WITH CHECK (public.get_workspace_role(workspace_id) IN ('admin', 'operator'));

-- Timestamp trigger
CREATE TRIGGER update_workspace_features_updated_at
BEFORE UPDATE ON public.workspace_features
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed function
CREATE OR REPLACE FUNCTION public.seed_workspace_features(ws_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO workspace_features (workspace_id, feature_key, enabled, label, description, icon, category, sort_order)
  VALUES
    (ws_id, 'tasks',              true,  'Tasks',              'Task management with projects and domains',           'CheckSquare',   'productivity', 0),
    (ws_id, 'inbox',              true,  'Inbox',              'Email inbox and communication hub',                   'Mail',          'communication', 1),
    (ws_id, 'content_pipeline',   true,  'Content Pipeline',   'Plan and manage content production',                  'Film',          'content', 2),
    (ws_id, 'trend_scanner',      true,  'Trend Scanner',      'Discover trending topics and opportunities',          'Crosshair',     'content', 3),
    (ws_id, 'content_management', true,  'Content Management', 'YouTube analytics, A/B testing, and optimization',    'Tv',            'content', 4),
    (ws_id, 'growth',             true,  'Growth',             'Growth forecasting, funnels, and competitor intel',    'TrendingUp',    'analytics', 5),
    (ws_id, 'finance',            true,  'Finance',            'Revenue tracking, expenses, budgets, and tax prep',   'Wallet',        'business', 6),
    (ws_id, 'network',            true,  'Network',            'CRM contacts, companies, and relationships',          'Users',         'business', 7),
    (ws_id, 'subscribers',        true,  'Subscribers',        'Newsletter subscribers and engagement',               'UserPlus',      'audience', 8),
    (ws_id, 'reports',            true,  'Reports',            'Weekly and custom reports',                            'FileText',      'analytics', 9),
    (ws_id, 'ai_hub',             true,  'AI Hub',             'AI chat, agents, memory, and proposals',              'Brain',         'intelligence', 10),
    (ws_id, 'integrations',       true,  'Integrations',       'Third-party service connections',                     'Zap',           'system', 11)
  ON CONFLICT (workspace_id, feature_key) DO NOTHING;
END;
$$;

-- Auto-seed features on workspace creation
CREATE OR REPLACE FUNCTION public.auto_seed_workspace_features()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM seed_workspace_features(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_workspace_features
AFTER INSERT ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.auto_seed_workspace_features();

-- Seed features for existing workspaces
DO $$
DECLARE ws RECORD;
BEGIN
  FOR ws IN SELECT id FROM workspaces LOOP
    PERFORM seed_workspace_features(ws.id);
  END LOOP;
END;
$$;
