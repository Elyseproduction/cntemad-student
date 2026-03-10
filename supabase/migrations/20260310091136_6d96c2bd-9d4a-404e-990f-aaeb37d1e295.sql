
-- Create typing_status table
CREATE TABLE public.typing_status (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL DEFAULT 'global',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel_id)
);

ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read typing status" ON public.typing_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own typing" ON public.typing_status FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own typing" ON public.typing_status FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own typing" ON public.typing_status FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime for typing_status
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_status;

-- Create message_views table
CREATE TABLE public.message_views (
  message_id UUID NOT NULL REFERENCES public.community_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

ALTER TABLE public.message_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read views" ON public.message_views FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own views" ON public.message_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own views" ON public.message_views FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime for message_views
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_views;
