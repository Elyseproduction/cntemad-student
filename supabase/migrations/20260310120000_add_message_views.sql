CREATE TABLE public.message_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.community_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX idx_message_views_message_id ON public.message_views(message_id);
CREATE INDEX idx_message_views_user_id ON public.message_views(user_id);

ALTER TABLE public.message_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read message views"
  ON public.message_views FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert views"
  ON public.message_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_views;
