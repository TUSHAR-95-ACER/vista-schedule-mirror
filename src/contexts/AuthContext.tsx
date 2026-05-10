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

  const authDebug = (stage: string, details: Record<string, unknown> = {}) => {
    console.info(`[auth] ${stage}`, {
      origin: window.location.origin,
      path: window.location.pathname,
      inIframe: window.self !== window.top,
      ...details,
    });
  };

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

    // Retry getSession once on transient network failure before giving up.
    const tryGetSession = async (attempt = 1): Promise<void> => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (!mounted || authEventSeenRef.current) return;
        if (error) {
          // Auth-level error (bad/expired refresh token) → clear local session.
          console.warn('[auth] getSession returned error; clearing local session', error);
          supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        }
        setSession(currentSession ?? null);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      } catch (error) {
        if (!mounted || authEventSeenRef.current) return;
        // Network/transport failure — retry once after short backoff before
        // assuming the stored session is bad.
        if (attempt < 2) {
          console.warn(`[auth] getSession transient failure (attempt ${attempt}); retrying`, error);
          await new Promise((r) => setTimeout(r, 1200));
          return tryGetSession(attempt + 1);
        }
        console.warn('[auth] getSession failed after retry; continuing without session', error);
        // Do NOT signOut on pure network failure — preserve token for next load.
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    };

    tryGetSession().finally(() => clearTimeout(failsafe));

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
      authDebug('google oauth redirect start', {
        callbackOrigin: window.location.origin,
      });
      clearLocalAuthCache();
      const { lovable } = await import('@/integrations/lovable');
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      authDebug('google provider response', {
        redirected: Boolean(result?.redirected),
        hasError: Boolean(result?.error),
        errorMessage: result?.error?.message,
        hasTokens: Boolean(result && 'tokens' in result && result.tokens),
      });
      if (result?.error) {
        throw result.error;
      }
      if (result?.redirected) return;

      const { data, error } = await supabase.auth.getSession();
      authDebug('auth callback session check', {
        hasSession: Boolean(data.session),
        hasError: Boolean(error),
        errorMessage: error?.message,
      });
      if (error) throw error;
      if (data.session) {
        authDebug('auth session creation confirmed', { userId: data.session.user.id });
        setSession(data.session);
        setUser(data.session.user);
        setLoading(false);
      } else {
        throw new Error('Google sign in completed, but no session was created. Please try again from the published app URL.');
      }
    } catch (err) {
      setLoading(false);
      console.error('[auth] google consent-check failure details', {
        error: err,
        message: err instanceof Error ? err.message : String(err),
        origin: window.location.origin,
      });
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
    } catch (err) {
      console.error('[auth] email sign-in failed', err);
      throw err;
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
