
-- Content-to-sponsor taxonomy mapping
CREATE TABLE public.content_sponsor_taxonomy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  content_category text NOT NULL,
  sponsor_vertical text NOT NULL,
  affinity_score int NOT NULL DEFAULT 50,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, content_category, sponsor_vertical)
);
ALTER TABLE public.content_sponsor_taxonomy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage content_sponsor_taxonomy"
  ON public.content_sponsor_taxonomy FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Monthly sponsor opportunity board
CREATE TABLE public.sponsor_opportunity_board (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  month date NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  sponsor_vertical text NOT NULL DEFAULT 'general',
  content_categories text[] NOT NULL DEFAULT '{}',
  match_score int NOT NULL DEFAULT 0,
  historical_win_rate numeric NOT NULL DEFAULT 0,
  avg_deal_value numeric NOT NULL DEFAULT 0,
  total_past_revenue numeric NOT NULL DEFAULT 0,
  past_deal_count int NOT NULL DEFAULT 0,
  suggested_outreach_week int NOT NULL DEFAULT 1,
  suggested_package text NOT NULL DEFAULT 'standard',
  package_rationale text,
  outreach_status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sponsor_opportunity_board ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage sponsor_opportunity_board"
  ON public.sponsor_opportunity_board FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));
CREATE INDEX idx_sponsor_opportunity_board_ws_month ON public.sponsor_opportunity_board(workspace_id, month);
