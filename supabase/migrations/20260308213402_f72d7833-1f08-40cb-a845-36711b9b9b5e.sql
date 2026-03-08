
-- Drop remaining policies (without trailing space)
DROP POLICY IF EXISTS "Anyone can read messages" ON public.community_messages;
DROP POLICY IF EXISTS "Anyone can insert messages" ON public.community_messages;
DROP POLICY IF EXISTS "Anyone can update messages" ON public.community_messages;
DROP POLICY IF EXISTS "Anyone can delete messages" ON public.community_messages;

-- Recreate as PERMISSIVE policies (default is permissive)
CREATE POLICY "Anyone can read messages"
  ON public.community_messages FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert messages"
  ON public.community_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update messages"
  ON public.community_messages FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete messages"
  ON public.community_messages FOR DELETE
  USING (true);
