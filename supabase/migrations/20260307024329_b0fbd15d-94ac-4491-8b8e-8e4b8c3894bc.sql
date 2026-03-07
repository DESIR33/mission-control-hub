-- Create the logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true);

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');

-- Allow authenticated users to update logos
CREATE POLICY "Authenticated users can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logos');

-- Allow public read access to logos
CREATE POLICY "Public read access for logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');