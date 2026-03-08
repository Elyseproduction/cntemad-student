
CREATE TABLE public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read config
CREATE POLICY "Anyone can read config"
  ON public.app_config FOR SELECT
  USING (true);

-- Authenticated users can insert/update (admin check done in app)
CREATE POLICY "Authenticated can insert config"
  ON public.app_config FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update config"
  ON public.app_config FOR UPDATE
  TO authenticated
  USING (true);
