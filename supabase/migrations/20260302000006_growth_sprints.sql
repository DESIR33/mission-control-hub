-- Feature 13: Weekly Growth Sprint Planner
CREATE TABLE IF NOT EXISTS growth_sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  sub_target INT NOT NULL DEFAULT 0,
  sub_count_start INT,
  sub_count_end INT,
  goals JSONB NOT NULL DEFAULT '[]',
  tasks JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planning','active','completed','skipped')),
  retrospective TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_growth_sprints_workspace ON growth_sprints(workspace_id, week_start DESC);

ALTER TABLE growth_sprints ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'growth_sprints' AND policyname = 'growth_sprints_select') THEN
    CREATE POLICY growth_sprints_select ON growth_sprints FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'growth_sprints' AND policyname = 'growth_sprints_all') THEN
    CREATE POLICY growth_sprints_all ON growth_sprints FOR ALL USING (true);
  END IF;
END $$;
