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

    const loadViewers = async () => {
      const { data } = await supabase
        .from('message_views' as any)
        .select(`
          user_id,
          viewed_at
        `)
        .eq('message_id', messageId)
        .order('viewed_at', { ascending: false });

      if (data) {
        // Fetch profile info for each viewer
        const viewerIds = (data as any[]).map((v: any) => v.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', viewerIds);
        
        const profileMap = new Map((profiles || []).map(p => [p.id, p]));
        setViewers((data as any[]).map((v: any) => ({
          user_id: v.user_id,
          viewed_at: v.viewed_at,
          user: {
            display_name: profileMap.get(v.user_id)?.display_name || 'Inconnu',
            avatar_url: profileMap.get(v.user_id)?.avatar_url || null,
          },
        })));
      }
    };

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

      loadViewers();
    };

    loadViewers();
    markAsViewed();

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
