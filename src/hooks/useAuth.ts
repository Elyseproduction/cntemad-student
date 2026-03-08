import { useState, useEffect, useCallback } from 'react';
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
  needsSetup: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    needsSetup: false,
  });

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
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
  }, []);

  const isProfileSetup = useCallback((profile: Profile | null, user: User | null): boolean => {
    if (!profile || !user) return false;
    // Profile needs setup if display_name is still the default from Google
    const googleName = user.user_metadata?.full_name || user.user_metadata?.name;
    const emailPrefix = user.email?.split('@')[0];
    const dn = profile.display_name;
    // If display_name matches the Google name or email prefix, it hasn't been customized
    if (!dn || dn === googleName || dn === emailPrefix) return false;
    return true;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function handleSession(session: Session | null) {
      if (!mounted) return;
      const user = session?.user ?? null;
      let profile: Profile | null = null;
      let needsSetup = false;
      if (user) {
        profile = await fetchProfile(user.id);
        // Check if this is a first-time user who hasn't set up their profile
        const setupDone = localStorage.getItem(`profile_setup_${user.id}`);
        if (!setupDone && !isProfileSetup(profile, user)) {
          needsSetup = true;
        }
      }
      if (mounted) setState({ user, profile, session, loading: false, needsSetup });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setTimeout(() => handleSession(session), 0);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    }).catch(() => {
      if (mounted) setState({ user: null, profile: null, session: null, loading: false, needsSetup: false });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, isProfileSetup]);

  const completeSetup = useCallback(async () => {
    if (!state.user) return;
    localStorage.setItem(`profile_setup_${state.user.id}`, 'done');
    const profile = await fetchProfile(state.user.id);
    setState(prev => ({ ...prev, profile, needsSetup: false }));
  }, [state.user, fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { ...state, signOut, completeSetup };
}
