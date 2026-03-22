
-- Add saved/retained tracking and journey tier to churn risk table
ALTER TABLE public.subscriber_churn_risk
  ADD COLUMN IF NOT EXISTS journey_tier text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS journey_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS journey_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS saved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS saved_at timestamptz,
  ADD COLUMN IF NOT EXISTS pre_journey_open_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS post_journey_open_rate numeric DEFAULT 0;

-- Churn recovery outcomes log for reporting
CREATE TABLE public.churn_recovery_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_at_risk int NOT NULL DEFAULT 0,
  low_risk_count int NOT NULL DEFAULT 0,
  medium_risk_count int NOT NULL DEFAULT 0,
  high_risk_count int NOT NULL DEFAULT 0,
  critical_risk_count int NOT NULL DEFAULT 0,
  journeys_triggered int NOT NULL DEFAULT 0,
  journeys_completed int NOT NULL DEFAULT 0,
  subscribers_saved int NOT NULL DEFAULT 0,
  subscribers_lost int NOT NULL DEFAULT 0,
  saved_rate numeric NOT NULL DEFAULT 0,
  incremental_retained int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, period_start, period_end)
);
ALTER TABLE public.churn_recovery_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage churn_recovery_outcomes"
  ON public.churn_recovery_outcomes FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));
