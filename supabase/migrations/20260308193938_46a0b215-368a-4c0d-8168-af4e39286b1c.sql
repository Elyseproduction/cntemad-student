-- Create community_messages table
CREATE TABLE public.community_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auteur TEXT NOT NULL,
  avatar TEXT NOT NULL,
  couleur TEXT NOT NULL,
  contenu TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reactions JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

-- Everyone can read messages
CREATE POLICY "Anyone can read messages"
  ON public.community_messages FOR SELECT
  USING (true);

-- Anyone can insert messages (public chat)
CREATE POLICY "Anyone can insert messages"
  ON public.community_messages FOR INSERT
  WITH CHECK (true);

-- Anyone can update reactions
CREATE POLICY "Anyone can update messages"
  ON public.community_messages FOR UPDATE
  USING (true);

-- Insert default messages
INSERT INTO public.community_messages (auteur, avatar, couleur, contenu, type, reactions, created_at) VALUES
  ('Alice', 'A', '#6C63FF', 'Salut tout le monde ! Quelqu''un a compris le chapitre sur la normalisation ? 😅', 'text', '{"👍": 3, "😂": 1}'::jsonb, now() - interval '30 minutes'),
  ('Bob', 'B', '#00BCD4', 'Oui ! La 3NF c''est quand il n''y a pas de dépendance transitive. En gros, chaque attribut dépend directement de la clé primaire.', 'text', '{"👍": 5, "❤️": 2}'::jsonb, now() - interval '27 minutes'),
  ('Clara', 'C', '#FF6B6B', 'J''ai trouvé une super vidéo sur le modèle OSI, je la partage dans la vidéothèque ! 🎬', 'text', '{"🔥": 4}'::jsonb, now() - interval '22 minutes'),
  ('David', 'D', '#FFB74D', 'Les exercices IA sur l''algorithmique sont top, j''ai eu 9/10 ! 💪', 'text', '{"🔥": 6, "👍": 3}'::jsonb, now() - interval '10 minutes'),
  ('Emma', 'E', '#AB47BC', 'Qui est motivé pour réviser ensemble ce weekend ? On pourrait faire un appel et bosser les réseaux 🌐', 'text', '{"❤️": 4, "👍": 2}'::jsonb, now() - interval '5 minutes');