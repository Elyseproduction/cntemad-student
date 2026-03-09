CREATE TABLE public.chapter_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  prompt TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chapter_images_chapter_id ON public.chapter_images(chapter_id);

ALTER TABLE public.chapter_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read chapter images"
  ON public.chapter_images FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert chapter images"
  ON public.chapter_images FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin_badge = true
  ));

CREATE POLICY "Admins can delete chapter images"
  ON public.chapter_images FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin_badge = true
  ));
