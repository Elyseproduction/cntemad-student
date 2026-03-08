-- Create public storage bucket for community media (photos + videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('community-media', 'community-media', true, 104857600);

-- Allow anyone to read files
CREATE POLICY "Anyone can view community media"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-media');

-- Allow anyone to upload files
CREATE POLICY "Anyone can upload community media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'community-media');