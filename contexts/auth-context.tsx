"use client";

import React, {
  createContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/utils/supabase/client";

type AuthUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  provider: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

export function AuthProvider({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email ?? null,
          full_name: data.user.user_metadata?.full_name ?? null,
          provider: data.user.app_metadata?.provider ?? null,
        });
      } else {
        setUser(null);
      }

      setLoading(false);
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email ?? null,
            full_name: session.user.user_metadata?.full_name ?? null,
            provider: session.user.app_metadata?.provider ?? null,
          });
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  const login = useCallback(async () => {
    const redirectTo = `${window.location.origin}/auth/callback?next=/`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          prompt: "select_account", // <-- force le choix du compte
        },
      },
    });

    if (error) console.error("OAuth error:", error.message);
  }, [supabase]);

  const logout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" });
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!user) return;
    await fetch(`/api/users/${user.id}/delete`, { method: "DELETE" });
    setUser(null);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout, deleteAccount }),
    [user, loading, login, logout, deleteAccount]
  );

  if (loading) return <>{fallback ?? null}</>;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
