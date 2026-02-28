-- Add social_discord column to contacts table
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS social_discord TEXT;
