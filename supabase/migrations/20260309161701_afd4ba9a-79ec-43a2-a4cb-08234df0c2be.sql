-- Storage bucket for training selfies
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-images', 'training-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated uploads
CREATE POLICY "Authenticated users can upload training images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'training-images');

CREATE POLICY "Anyone can view training images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'training-images');

CREATE POLICY "Authenticated users can delete own training images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'training-images');

-- Training sessions table
CREATE TABLE public.flux_training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled Training',
  status text NOT NULL DEFAULT 'pending',
  trigger_word text NOT NULL DEFAULT 'MYFACE',
  replicate_training_id text,
  replicate_model_name text,
  replicate_model_version text,
  training_started_at timestamptz,
  training_completed_at timestamptz,
  error_message text,
  image_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.flux_training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage training sessions in their workspace"
ON public.flux_training_sessions FOR ALL TO authenticated
USING (is_workspace_member(workspace_id))
WITH CHECK (is_workspace_member(workspace_id));

-- Training images table
CREATE TABLE public.flux_training_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES flux_training_sessions(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  caption text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.flux_training_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage training images in their workspace"
ON public.flux_training_images FOR ALL TO authenticated
USING (is_workspace_member(workspace_id))
WITH CHECK (is_workspace_member(workspace_id));

-- Feedback on generated thumbnails
CREATE TABLE public.flux_generation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  session_id uuid REFERENCES flux_training_sessions(id) ON DELETE SET NULL,
  image_url text NOT NULL,
  prompt text,
  is_positive boolean NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.flux_generation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage generation feedback in their workspace"
ON public.flux_generation_feedback FOR ALL TO authenticated
USING (is_workspace_member(workspace_id))
WITH CHECK (is_workspace_member(workspace_id));