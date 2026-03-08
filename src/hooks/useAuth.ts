import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ?? null;
        let profile: Profile | null = null;

        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .eq('id', user.id)
            .single();
          profile = data;
        }

        setState({ user, profile, session, loading: false });
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null;
      let profile: Profile | null = null;

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .eq('id', user.id)
          .single();
        profile = data;
      }

      setState({ user, profile, session, loading: false });
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { ...state, signOut };
}
