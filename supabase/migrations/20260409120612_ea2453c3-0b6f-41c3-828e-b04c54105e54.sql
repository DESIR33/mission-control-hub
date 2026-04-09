
ALTER TABLE public.assistant_memory
ADD COLUMN IF NOT EXISTS edit_history jsonb DEFAULT '[]'::jsonb;
