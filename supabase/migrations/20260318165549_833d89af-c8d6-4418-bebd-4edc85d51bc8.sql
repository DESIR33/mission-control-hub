
-- Add new columns to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'template' CHECK (category IN ('template', 'plugin')),
  ADD COLUMN IF NOT EXISTS marketplace text DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sale_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recurring_price numeric DEFAULT NULL;

-- Drop the old type column constraint and update to new values
-- The old 'type' column had 'digital'/'physical', we keep it but it's now secondary to 'category'

COMMENT ON COLUMN products.category IS 'Product category: template or plugin';
COMMENT ON COLUMN products.marketplace IS 'Where the product is sold (e.g. Gumroad, Envato)';
COMMENT ON COLUMN products.company_id IS 'Links marketplace to a company in CRM';
COMMENT ON COLUMN products.sale_price IS 'Listed sale price';
COMMENT ON COLUMN products.commission IS 'Marketplace commission/fees per sale';
COMMENT ON COLUMN products.net_amount IS 'Amount kept after commission';
COMMENT ON COLUMN products.recurring_price IS 'Monthly recurring price for plugins (null if one-time only)';
