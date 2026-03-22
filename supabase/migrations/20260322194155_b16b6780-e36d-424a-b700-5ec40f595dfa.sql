
-- Automation operations log: unified view of all automated actions across agents
CREATE TABLE public.automation_operations_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_slug text NOT NULL,
  domain text NOT NULL DEFAULT 'general',
  operation_type text NOT NULL,
  entity_type text,
  entity_id text,
  entity_name text,
  risk_level text NOT NULL DEFAULT 'low',
  status text NOT NULL DEFAULT 'proposed',
  confidence numeric NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}',
  rationale text,
  result jsonb,
  rollback_payload jsonb,
  rolled_back_at timestamptz,
  rolled_back_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  executed_at timestamptz,
  execution_error text,
  source_proposal_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_operations_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage automation_operations_log"
  ON public.automation_operations_log FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE INDEX idx_aol_ws_status ON public.automation_operations_log(workspace_id, status);
CREATE INDEX idx_aol_ws_domain ON public.automation_operations_log(workspace_id, domain);
CREATE INDEX idx_aol_ws_agent ON public.automation_operations_log(workspace_id, agent_slug);
CREATE INDEX idx_aol_ws_risk ON public.automation_operations_log(workspace_id, risk_level);

COMMENT ON COLUMN public.automation_operations_log.domain IS 'inbox | content | finance | crm | growth';
COMMENT ON COLUMN public.automation_operations_log.risk_level IS 'low | medium | high | critical';
COMMENT ON COLUMN public.automation_operations_log.status IS 'proposed | approved | executing | executed | failed | rolled_back | rejected';

-- Approval policies: per-agent/domain rules for auto-execution
CREATE TABLE public.automation_approval_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_slug text,
  domain text,
  risk_level text NOT NULL DEFAULT 'low',
  auto_approve boolean NOT NULL DEFAULT false,
  confidence_threshold numeric NOT NULL DEFAULT 80,
  require_human_review boolean NOT NULL DEFAULT true,
  max_auto_executions_per_day integer NOT NULL DEFAULT 50,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, agent_slug, domain, risk_level)
);

ALTER TABLE public.automation_approval_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage automation_approval_policies"
  ON public.automation_approval_policies FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Agent ROI snapshots: periodic rollups of agent value
CREATE TABLE public.agent_roi_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_slug text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  operations_proposed integer NOT NULL DEFAULT 0,
  operations_executed integer NOT NULL DEFAULT 0,
  operations_rejected integer NOT NULL DEFAULT 0,
  operations_rolled_back integer NOT NULL DEFAULT 0,
  time_saved_minutes numeric NOT NULL DEFAULT 0,
  revenue_influenced numeric NOT NULL DEFAULT 0,
  errors_count integer NOT NULL DEFAULT 0,
  avg_confidence numeric NOT NULL DEFAULT 0,
  acceptance_rate numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, agent_slug, period_start)
);

ALTER TABLE public.agent_roi_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can view agent_roi_snapshots"
  ON public.agent_roi_snapshots FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));
