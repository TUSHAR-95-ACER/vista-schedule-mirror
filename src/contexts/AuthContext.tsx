import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { clearAllUserStorage } from '@/lib/userStorage';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const authEventSeenRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    console.info('[auth] init', {
      hasUrl: Boolean(import.meta.env.VITE_SUPABASE_URL),
      hasKey: Boolean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
      origin: window.location.origin,
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      authEventSeenRef.current = true;
      console.info('[auth] state change', { event, signedIn: Boolean(nextSession?.user) });
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    // Hard timeout so the UI never gets stuck on "Loading..." if the auth
    // server is unreachable or the stored refresh token is bad.
    const failsafe = setTimeout(() => {
      console.warn('[auth] init timeout - showing login instead of blocking UI');
      if (mounted) setLoading(false);
    }, 8000);

    supabase.auth.getSession()
      .then(({ data: { session: currentSession }, error }) => {
        if (!mounted || authEventSeenRef.current) return;
        if (error) {
          // Stale/invalid refresh token in localStorage → clear it so we don't
          // loop forever trying to refresh.
          console.warn('[auth] getSession failed; clearing local session', error);
          supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        }
        setSession(currentSession ?? null);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
        if (!mounted || authEventSeenRef.current) return;
        console.warn('[auth] getSession network failure; clearing local session', error);
        supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setSession(null);
        setUser(null);
        setLoading(false);
      })
      .finally(() => clearTimeout(failsafe));

    return () => {
      mounted = false;
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, []);

  const clearLocalAuthCache = () => {
    Object.keys(localStorage)
      .filter((key) => /^sb-.+-auth-token$/.test(key) || key === 'supabase.auth.token')
      .forEach((key) => localStorage.removeItem(key));
  };

  const signInWithGoogle = async () => {
    try {
      console.info('[auth] google sign-in start');
      clearLocalAuthCache();
      const { lovable } = await import('@/integrations/lovable');
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
        extraParams: { prompt: 'select_account' },
      });
      if (result?.error) {
        throw result.error;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        console.info('[auth] google sign-in session confirmed');
        setSession(data.session);
        setUser(data.session.user);
      }
    } catch (err) {
      console.error('[auth] google sign-in failed', err);
      throw err;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    console.info('[auth] email sign-in start', { email });
    try {
      clearLocalAuthCache();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('[auth] email sign-in failed', error);
        throw error;
      }
      if (!data.session) {
        const noSessionError = new Error('Sign in completed but no session was returned. Please verify your email and try again.');
        console.error('[auth] email sign-in returned no session', noSessionError);
        throw noSessionError;
      }
      setSession(data.session);
      setUser(data.user ?? data.session.user);
      console.info('[auth] email sign-in request accepted');
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || '' },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const currentUserId = user?.id;
    await supabase.auth.signOut();
    if (currentUserId) clearAllUserStorage(currentUserId);
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
