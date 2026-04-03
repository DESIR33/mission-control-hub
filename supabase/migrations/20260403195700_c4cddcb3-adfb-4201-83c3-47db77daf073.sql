-- 1. Add new columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS funding_stage text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS total_funding numeric;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_funding_date date;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS founded_year integer;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS founder_names text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS pricing_model text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tech_stack text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS outreach_status text DEFAULT 'not_contacted';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sponsor_fit_score integer;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS competitor_group text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS social_github text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS social_discord text;

-- 2. Create funding_rounds table
CREATE TABLE IF NOT EXISTS funding_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  round_type text NOT NULL,
  amount numeric,
  valuation_pre numeric,
  valuation_post numeric,
  date date,
  lead_investor text,
  other_investors text,
  source_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE funding_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view funding rounds" ON funding_rounds FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can insert funding rounds" ON funding_rounds FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Members can update funding rounds" ON funding_rounds FOR UPDATE TO authenticated USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can delete funding rounds" ON funding_rounds FOR DELETE TO authenticated USING (is_workspace_member(workspace_id));

CREATE TRIGGER update_funding_rounds_updated_at BEFORE UPDATE ON funding_rounds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Create company_people table
CREATE TABLE IF NOT EXISTS company_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  is_founder boolean DEFAULT false,
  email text,
  phone text,
  linkedin_url text,
  twitter_handle text,
  notes text,
  contact_id uuid REFERENCES contacts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE company_people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view company people" ON company_people FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can insert company people" ON company_people FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Members can update company people" ON company_people FOR UPDATE TO authenticated USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can delete company people" ON company_people FOR DELETE TO authenticated USING (is_workspace_member(workspace_id));

CREATE TRIGGER update_company_people_updated_at BEFORE UPDATE ON company_people FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Create company_pricing table
CREATE TABLE IF NOT EXISTS company_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tier_name text NOT NULL,
  price_monthly numeric,
  price_yearly numeric,
  currency text DEFAULT 'USD',
  features text,
  is_most_popular boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  last_verified_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE company_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view company pricing" ON company_pricing FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can insert company pricing" ON company_pricing FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Members can update company pricing" ON company_pricing FOR UPDATE TO authenticated USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can delete company pricing" ON company_pricing FOR DELETE TO authenticated USING (is_workspace_member(workspace_id));

CREATE TRIGGER update_company_pricing_updated_at BEFORE UPDATE ON company_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Create company_relationships table
CREATE TABLE IF NOT EXISTS company_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  company_a_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_b_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  relationship_type text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, company_a_id, company_b_id, relationship_type)
);

ALTER TABLE company_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view company relationships" ON company_relationships FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can insert company relationships" ON company_relationships FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "Members can update company relationships" ON company_relationships FOR UPDATE TO authenticated USING (is_workspace_member(workspace_id));
CREATE POLICY "Members can delete company relationships" ON company_relationships FOR DELETE TO authenticated USING (is_workspace_member(workspace_id));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_funding_rounds_company ON funding_rounds(company_id);
CREATE INDEX IF NOT EXISTS idx_company_people_company ON company_people(company_id);
CREATE INDEX IF NOT EXISTS idx_company_pricing_company ON company_pricing(company_id);
CREATE INDEX IF NOT EXISTS idx_company_relationships_a ON company_relationships(company_a_id);
CREATE INDEX IF NOT EXISTS idx_company_relationships_b ON company_relationships(company_b_id);
CREATE INDEX IF NOT EXISTS idx_companies_outreach_status ON companies(outreach_status);
CREATE INDEX IF NOT EXISTS idx_companies_competitor_group ON companies(competitor_group);