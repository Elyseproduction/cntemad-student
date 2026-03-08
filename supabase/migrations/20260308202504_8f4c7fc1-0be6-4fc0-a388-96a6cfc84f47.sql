
ALTER TABLE public.community_messages 
ADD COLUMN is_deleted boolean NOT NULL DEFAULT false,
ADD COLUMN is_edited boolean NOT NULL DEFAULT false,
ADD COLUMN reply_to uuid REFERENCES public.community_messages(id) ON DELETE SET NULL DEFAULT NULL;

-- Add DELETE policy
CREATE POLICY "Anyone can delete messages" ON public.community_messages FOR DELETE USING (true);
