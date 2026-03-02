-- Feature 15: Growth Goal Tracker with Pace Analysis
ALTER TABLE growth_goals ADD COLUMN IF NOT EXISTS micro_targets JSONB DEFAULT '[]';
ALTER TABLE growth_goals ADD COLUMN IF NOT EXISTS weekly_required_rate NUMERIC;
