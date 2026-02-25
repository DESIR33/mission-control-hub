-- Create storage buckets for avatar and logo uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('logos',   'logos',   true, 2097152, ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload their own avatars
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

-- Authenticated users can update their own avatars
CREATE POLICY "Authenticated users can update avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

-- Authenticated users can delete their own avatars
CREATE POLICY "Authenticated users can delete avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');

-- Public read access for avatars
CREATE POLICY "Public read access for avatars"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Authenticated users can upload workspace logos
CREATE POLICY "Authenticated users can upload logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos');

-- Authenticated users can update workspace logos
CREATE POLICY "Authenticated users can update logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'logos');

-- Authenticated users can delete workspace logos
CREATE POLICY "Authenticated users can delete logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'logos');

-- Public read access for logos
CREATE POLICY "Public read access for logos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'logos');
