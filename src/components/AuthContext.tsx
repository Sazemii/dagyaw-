"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isCommunityWatcher: boolean;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isCommunityWatcher: false,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthCtx);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isCommunityWatcher = !!user?.user_metadata?.is_community_watcher;

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthCtx value={{ user, session, loading, isCommunityWatcher, signOut }}>
      {children}
    </AuthCtx>
  );
}
