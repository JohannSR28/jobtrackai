"use client";

import { useCallback, useState } from "react";

type LatestState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; mails: unknown }
  | {
      kind: "error";
      message: string;
      code?: "REAUTH_REQUIRED" | "NOT_AUTHENTICATED";
    };

function getErrorCode(v: unknown): string | null {
  if (typeof v !== "object" || v === null) return null;
  if (!("error" in v)) return null;
  const err = (v as { error: unknown }).error;
  return typeof err === "string" ? err : null;
}

function stringify(v: unknown): string {
  if (typeof v === "string") return v;
  if (v instanceof Error) return v.message;
  try {
    return JSON.stringify(v);
  } catch {
    return "UNKNOWN_ERROR";
  }
}

export function useMailActions() {
  const [latest, setLatest] = useState<LatestState>({ kind: "idle" });

  const fetchLatest = useCallback(async (limit = 5) => {
    setLatest({ kind: "loading" });

    const r = await fetch(`/api/mail/test/latest?limit=${limit}`, {
      cache: "no-store",
    });
    const body: unknown = await r.json();

    if (!r.ok) {
      const code = getErrorCode(body);
      if (r.status === 401 && code === "REAUTH_REQUIRED") {
        setLatest({
          kind: "error",
          message: "REAUTH_REQUIRED",
          code: "REAUTH_REQUIRED",
        });
        return;
      }
      if (r.status === 401 && code === "NOT_AUTHENTICATED") {
        setLatest({
          kind: "error",
          message: "NOT_AUTHENTICATED",
          code: "NOT_AUTHENTICATED",
        });
        return;
      }
      setLatest({ kind: "error", message: stringify(body) });
      return;
    }

    // ton endpoint renvoie probablement { mails: [...] }
    // on garde unknown pour rester compatible
    setLatest({ kind: "ok", mails: body });
  }, []);

  const removeConnection = useCallback(async (): Promise<
    | { ok: true }
    | {
        ok: false;
        code: "NOT_AUTHENTICATED" | "INTERNAL_ERROR";
        message: string;
      }
  > => {
    try {
      const r = await fetch("/api/mail/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const body: unknown = await r.json();

      if (!r.ok) {
        const code = getErrorCode(body);
        if (r.status === 401 && code === "NOT_AUTHENTICATED") {
          return {
            ok: false,
            code: "NOT_AUTHENTICATED",
            message: "NOT_AUTHENTICATED",
          };
        }
        return { ok: false, code: "INTERNAL_ERROR", message: stringify(body) };
      }

      // Optionnel: reset l'affichage des mails
      setLatest({ kind: "idle" });
      return { ok: true };
    } catch (e: unknown) {
      return { ok: false, code: "INTERNAL_ERROR", message: stringify(e) };
    }
  }, []);

  return { latest, fetchLatest, removeConnection };
}
