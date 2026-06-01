"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/fetch-timeout";

interface AppUserContextValue {
  userId: string | null;
  email: string | null;
  authReady: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AppUserContext = createContext<AppUserContextValue | null>(null);

export function AppUserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const refreshUser = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setUserId(null);
      setEmail(null);
      setAuthReady(true);
      return;
    }

    try {
      const { data } = await withTimeout(supabase.auth.getUser(), 6_000);
      setUserId(data.user?.id ?? null);
      setEmail(data.user?.email ?? null);
    } catch {
      setUserId(null);
      setEmail(null);
    } finally {
      setAuthReady(true);
    }
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    void refreshUser().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    setUserId(null);
    setEmail(null);
  }, [supabase]);

  const value = useMemo(
    () => ({ userId, email, authReady, signOut, refreshUser }),
    [userId, email, authReady, signOut, refreshUser]
  );

  return (
    <AppUserContext.Provider value={value}>{children}</AppUserContext.Provider>
  );
}

export function useAppUser(): AppUserContextValue {
  const ctx = useContext(AppUserContext);
  if (!ctx) {
    throw new Error("useAppUser must be used within AppUserProvider");
  }
  return ctx;
}
