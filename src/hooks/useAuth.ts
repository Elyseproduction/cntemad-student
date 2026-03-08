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
    let mounted = true;

    async function fetchProfile(userId: string): Promise<Profile | null> {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        console.warn('Profile fetch error:', error.message);
        return null;
      }
      return data;
    }

    async function handleSession(session: Session | null) {
      if (!mounted) return;
      const user = session?.user ?? null;
      let profile: Profile | null = null;
      if (user) {
        profile = await fetchProfile(user.id);
      }
      if (mounted) setState({ user, profile, session, loading: false });
    }

    // Set up auth listener FIRST — avoid async in callback to prevent deadlock
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Use setTimeout to avoid Supabase internal lock issues
        setTimeout(() => handleSession(session), 0);
      }
    );

    // Then check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    }).catch(() => {
      if (mounted) setState({ user: null, profile: null, session: null, loading: false });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { ...state, signOut };
}
