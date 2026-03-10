
-- Create storage bucket for video uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('videos', 'videos', true, 524288000);

-- Allow authenticated users to upload videos
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'videos');

-- Anyone can read videos
CREATE POLICY "Anyone can read videos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'videos');

-- Users can delete their own videos
CREATE POLICY "Users can delete own videos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);
