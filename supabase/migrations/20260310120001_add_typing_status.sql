CREATE TABLE public.typing_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL DEFAULT 'global',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_id)
);

CREATE INDEX idx_typing_status_updated ON public.typing_status(updated_at);

ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read typing status"
  ON public.typing_status FOR SELECT
  USING (true);

CREATE POLICY "Users can insert/update their own typing status"
  ON public.typing_status FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION clean_typing_status()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.typing_status
  WHERE updated_at < now() - interval '3 seconds';
END;
$$;

SELECT cron.schedule(
  'clean-typing-status',
  '* * * * * *',
  'SELECT clean_typing_status();'
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_status;
