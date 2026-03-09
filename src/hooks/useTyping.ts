import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useTyping(channelId: string = 'global') {
  const { user } = useAuth();
  const heartbeatRef = useRef<NodeJS.Timeout>();

  const startTyping = useCallback(async () => {
    if (!user) return;

    await supabase
      .from('typing_status')
      .upsert({
        user_id: user.id,
        channel_id: channelId,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,channel_id',
      });

    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    heartbeatRef.current = setInterval(async () => {
      await supabase
        .from('typing_status')
        .upsert({
          user_id: user.id,
          channel_id: channelId,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,channel_id',
        });
    }, 2000);
  }, [user, channelId]);

  const stopTyping = useCallback(async () => {
    if (!user) return;

    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    await supabase
      .from('typing_status')
      .delete()
      .eq('user_id', user.id)
      .eq('channel_id', channelId);
  }, [user, channelId]);

  useEffect(() => {
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, []);

  return { startTyping, stopTyping };
}
