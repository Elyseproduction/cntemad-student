import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Viewer {
  user_id: string;
  viewed_at: string;
  user: {
    display_name: string;
    avatar_url: string | null;
  };
}

export function useMessageViews(messageId: string) {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!messageId) return;

    // Charger les viewers existants
    const loadViewers = async () => {
      const { data } = await supabase
        .from('message_views')
        .select(`
          user_id,
          viewed_at,
          user:profiles!message_views_user_id_fkey (
            display_name,
            avatar_url
          )
        `)
        .eq('message_id', messageId)
        .order('viewed_at', { ascending: false });

      if (data) {
        setViewers(data);
      }
    };

    // Marquer ce message comme vu par l'utilisateur actuel
    const markAsViewed = async () => {
      if (!user) return;

      await supabase
        .from('message_views')
        .upsert({
          message_id: messageId,
          user_id: user.id,
          viewed_at: new Date().toISOString(),
        }, {
          onConflict: 'message_id,user_id',
          ignoreDuplicates: false,
        });

      // Recharger pour inclure ce viewer
      loadViewers();
    };

    loadViewers();
    markAsViewed();

    // S'abonner aux nouveaux viewers en temps réel
    const channel = supabase
      .channel(`message-views-${messageId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_views',
          filter: `message_id=eq.${messageId}`,
        },
        async (payload) => {
          // Charger les détails du nouvel utilisateur
          const { data } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          if (data) {
            setViewers(prev => [
              {
                user_id: payload.new.user_id,
                viewed_at: payload.new.viewed_at,
                user: data,
              },
              ...prev,
            ]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId, user]);

  return viewers;
}
