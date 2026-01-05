"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

export type AuthProvider = "google" | "azure";

type UseAuthReturn = {
  user: User | null;
  loading: boolean;
  signIn: (provider: AuthProvider, next?: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

function getProviderOptions(provider: AuthProvider) {
  if (provider === "azure") {
    return {
      scopes: "email",
      queryParams: {
        prompt: "login",
      },
    };
  }

  // Google
  return {
    queryParams: {
      prompt: "consent",
    },
  };
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown };
    if (typeof data?.error === "string") return data.error;
  } catch {
    // ignore
  }
  return `Request failed (${res.status})`;
}

export function useAuth(): UseAuthReturn {
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.getUser();
    if (!error) setUser(data.user ?? null);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    refreshUser();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [supabase, refreshUser]);

  const signIn = useCallback(
    async (provider: AuthProvider, next: string = "/") => {
      const origin = window.location.origin;
      const redirectTo = `${origin}/api/auth/callback?next=${encodeURIComponent(
        next
      )}`;

      const providerOptions = getProviderOptions(provider);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          ...providerOptions,
        },
      });

      if (error) throw error;
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  }, [supabase]);

  const deleteAccount = useCallback(async () => {
    // Optionnel: confirmation UI côté composant (recommandé)
    // if (!confirm("Supprimer votre compte ? Cette action est définitive.")) return;

    const res = await fetch("/api/auth/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const msg = await readErrorMessage(res);
      throw new Error(msg);
    }

    // Après suppression, la session côté client peut encore exister localement => on nettoie
    await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  return { user, loading, signIn, signOut, deleteAccount, refreshUser };
}
