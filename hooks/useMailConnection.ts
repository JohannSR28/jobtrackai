"use client";

import { useCallback, useState } from "react";

export type MailStatus =
  | { authenticated: false; connected: false }
  | { authenticated: true; connected: false }
  | {
      authenticated: true;
      connected: true;
      provider: "gmail" | "outlook";
      email: string;
    };

type State = {
  status: MailStatus | null;
  loading: boolean;
  lastError: string | null;
};

function stringify(v: unknown): string {
  if (typeof v === "string") return v;
  if (v instanceof Error) return v.message;
  try {
    return JSON.stringify(v);
  } catch {
    return "UNKNOWN_ERROR";
  }
}

export function useMailConnection() {
  const [state, setState] = useState<State>({
    status: null,
    loading: false,
    lastError: null,
  });

  const pollStatus = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, lastError: null }));
    try {
      const r = await fetch("/api/mail/status", { cache: "no-store" });
      const data = (await r.json()) as MailStatus;
      setState({ status: data, loading: false, lastError: null });
      return data;
    } catch (e: unknown) {
      setState((s) => ({
        ...s,
        loading: false,
        lastError: stringify(e),
      }));
      return null;
    }
  }, []);

  const connect = useCallback((provider: "gmail" | "outlook") => {
    window.location.href = `/api/mail/connect?provider=${provider}`;
  }, []);

  const reset = useCallback(() => {
    setState({ status: null, loading: false, lastError: null });
  }, []);

  return { ...state, pollStatus, connect, reset };
}
