
-- Package experiment tracking for sponsor recommendations
CREATE TABLE public.sponsor_package_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  opportunity_id uuid,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  recommended_package text NOT NULL,
  recommended_value numeric NOT NULL DEFAULT 0,
  channel_subscribers integer NOT NULL DEFAULT 0,
  channel_views bigint NOT NULL DEFAULT 0,
  channel_video_count integer NOT NULL DEFAULT 0,
  avg_view_duration numeric NOT NULL DEFAULT 0,
  avg_ctr numeric NOT NULL DEFAULT 0,
  sponsor_vertical text,
  match_score numeric NOT NULL DEFAULT 0,
  historical_win_rate numeric NOT NULL DEFAULT 0,
  historical_avg_deal numeric NOT NULL DEFAULT 0,
  past_deal_count integer NOT NULL DEFAULT 0,
  package_rationale text,
  outcome text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  accepted_package text,
  accepted_value numeric,
  outcome_notes text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsor_package_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can manage sponsor_package_experiments"
  ON public.sponsor_package_experiments FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE INDEX idx_spe_ws_outcome ON public.sponsor_package_experiments(workspace_id, outcome);
CREATE INDEX idx_spe_company ON public.sponsor_package_experiments(company_id);

COMMENT ON COLUMN public.sponsor_package_experiments.outcome IS 'pending | accepted | rejected | counter_offered';
COMMENT ON COLUMN public.sponsor_package_experiments.recommended_package IS 'premium | standard | starter | explorer';
