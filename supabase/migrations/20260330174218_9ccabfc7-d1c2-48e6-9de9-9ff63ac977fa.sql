-- Add missing columns to contacts table
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS social_discord TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.contact_roles(id);