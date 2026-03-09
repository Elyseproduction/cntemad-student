CREATE TABLE public.code_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id TEXT NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL,
  starter_code TEXT,
  expected_output TEXT,
  language TEXT NOT NULL CHECK (language IN ('python', 'javascript', 'html', 'css')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_code_exercises_chapter ON public.code_exercises(chapter_id);
CREATE INDEX idx_code_exercises_language ON public.code_exercises(language);

ALTER TABLE public.code_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read code exercises"
  ON public.code_exercises FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert/update code exercises"
  ON public.code_exercises FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin_badge = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin_badge = true
  ));

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_code_exercises_updated_at
  BEFORE UPDATE ON public.code_exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
