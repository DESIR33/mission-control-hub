
-- beehiiv_publication_snapshots
CREATE TABLE public.beehiiv_publication_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  publication_id TEXT NOT NULL,
  active_subscribers INT NOT NULL DEFAULT 0,
  all_time_open_rate NUMERIC(5,2) DEFAULT 0,
  all_time_click_rate NUMERIC(5,2) DEFAULT 0,
  new_subscribers INT DEFAULT 0,
  churned_subscribers INT DEFAULT 0,
  net_subscribers INT DEFAULT 0,
  acquisition_sources JSONB,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, publication_id, snapshot_date)
);

ALTER TABLE public.beehiiv_publication_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view snapshots"
  ON public.beehiiv_publication_snapshots FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- beehiiv_sync_logs
CREATE TABLE public.beehiiv_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL DEFAULT 'subscribers',
  subscribers_synced INT DEFAULT 0,
  new_subscribers_count INT DEFAULT 0,
  status_changes_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running',
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.beehiiv_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view sync logs"
  ON public.beehiiv_sync_logs FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));
