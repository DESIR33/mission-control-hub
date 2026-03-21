-- Add AI tax deductibility fields to expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tax_deductible_reason text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tax_review_status text DEFAULT 'pending';

-- Create a function to seed default categories for a workspace (idempotent)
CREATE OR REPLACE FUNCTION public.seed_default_expense_categories(ws_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO expense_categories (workspace_id, name, color, icon)
  VALUES
    (ws_id, 'Software & Tools', '#6366f1', 'tag'),
    (ws_id, 'Equipment', '#3b82f6', 'tag'),
    (ws_id, 'Travel', '#f59e0b', 'tag'),
    (ws_id, 'Meals & Entertainment', '#ec4899', 'tag'),
    (ws_id, 'Office Supplies', '#10b981', 'tag'),
    (ws_id, 'Marketing & Ads', '#8b5cf6', 'tag'),
    (ws_id, 'Contractors & Freelancers', '#ef4444', 'tag'),
    (ws_id, 'Education & Training', '#14b8a6', 'tag'),
    (ws_id, 'Insurance', '#f97316', 'tag'),
    (ws_id, 'Utilities & Internet', '#64748b', 'tag'),
    (ws_id, 'Shipping & Postage', '#0ea5e9', 'tag'),
    (ws_id, 'Professional Services', '#a855f7', 'tag')
  ON CONFLICT DO NOTHING;
END;
$$;