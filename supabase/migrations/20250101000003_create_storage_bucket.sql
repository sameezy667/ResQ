-- Create storage bucket for incident images
-- This migration sets up the 'incident-images' bucket with proper policies

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'incident-images',
  'incident-images',
  true,  -- Public bucket so images can be viewed without auth
  10485760,  -- 10MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload images (authenticated or anonymous)
CREATE POLICY "Anyone can upload incident images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'incident-images');

-- Allow anyone to view images (public bucket)
CREATE POLICY "Anyone can view incident images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'incident-images');

-- Allow authenticated users to update their own uploads
CREATE POLICY "Users can update their own incident images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'incident-images' AND auth.uid()::text = owner)
WITH CHECK (bucket_id = 'incident-images');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Users can delete their own incident images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'incident-images' AND auth.uid()::text = owner);
