
-- Table to store thumbnail assessments and generated alternatives
CREATE TABLE public.thumbnail_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  youtube_video_id text NOT NULL,
  video_title text NOT NULL DEFAULT '',
  current_thumbnail_url text,
  assessment_json jsonb DEFAULT '{}'::jsonb,
  generated_thumbnails jsonb DEFAULT '[]'::jsonb,
  competitor_thumbnails jsonb DEFAULT '[]'::jsonb,
  selected_variant text,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.thumbnail_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view thumbnail_assessments"
  ON public.thumbnail_assessments FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert thumbnail_assessments"
  ON public.thumbnail_assessments FOR INSERT
  TO authenticated
  WITH CHECK (get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));

CREATE POLICY "Operators+ can update thumbnail_assessments"
  ON public.thumbnail_assessments FOR UPDATE
  TO authenticated
  USING (get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));

CREATE POLICY "Admins can delete thumbnail_assessments"
  ON public.thumbnail_assessments FOR DELETE
  TO authenticated
  USING (get_workspace_role(workspace_id) = 'admin');

-- Updated_at trigger
CREATE TRIGGER update_thumbnail_assessments_updated_at
  BEFORE UPDATE ON public.thumbnail_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
