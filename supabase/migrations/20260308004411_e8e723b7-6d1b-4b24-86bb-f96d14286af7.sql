ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS social_whatsapp text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS city text;