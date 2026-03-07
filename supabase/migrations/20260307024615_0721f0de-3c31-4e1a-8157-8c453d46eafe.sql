-- Create thumbnail-references storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnail-references', 'thumbnail-references', true);

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload thumbnail references"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'thumbnail-references');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete thumbnail references"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'thumbnail-references');

-- Allow public read access
CREATE POLICY "Public read access for thumbnail references"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'thumbnail-references');

-- Create table to track reference thumbnails with metadata
CREATE TABLE public.thumbnail_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  storage_path text NOT NULL,
  url text NOT NULL,
  label text,
  tags text[] DEFAULT '{}',
  source_channel text,
  source_video_url text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.thumbnail_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view thumbnail_references"
ON public.thumbnail_references FOR SELECT
TO authenticated
USING (is_workspace_member(workspace_id));

CREATE POLICY "Operators+ can insert thumbnail_references"
ON public.thumbnail_references FOR INSERT
TO authenticated
WITH CHECK (get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));

CREATE POLICY "Operators+ can update thumbnail_references"
ON public.thumbnail_references FOR UPDATE
TO authenticated
USING (get_workspace_role(workspace_id) = ANY (ARRAY['admin','operator','contributor']));

CREATE POLICY "Admins can delete thumbnail_references"
ON public.thumbnail_references FOR DELETE
TO authenticated
USING (get_workspace_role(workspace_id) = 'admin');