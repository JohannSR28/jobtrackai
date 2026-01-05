"use client";

import { useMemo, useState } from "react";
import GoToMainButton from "@/components/go-to-main";
import { useAuth } from "@/hooks/useAuth";

type Busy = null | "google" | "azure" | "logout" | "delete" | "refresh";

export default function AuthTestPage() {
  const { user, loading, signIn, signOut, deleteAccount, refreshUser } =
    useAuth();

  const [busy, setBusy] = useState<Busy>(null);
  const [err, setErr] = useState<string | null>(null);

  const email = useMemo(() => user?.email ?? "", [user]);

  async function run(action: Busy, fn: () => Promise<void>) {
    setErr(null);
    setBusy(action);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "UNKNOWN_ERROR");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto w-full max-w-3xl px-6 py-10">
          <div className="mb-6 flex items-center justify-between">
            <div className="h-9 w-40 rounded-xl bg-white/5 ring-1 ring-white/10" />
            <div className="h-8 w-24 rounded-full bg-white/5 ring-1 ring-white/10" />
          </div>

          <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="space-y-2">
              <div className="h-6 w-52 rounded-lg bg-white/10" />
              <div className="h-4 w-80 rounded-lg bg-white/5" />
            </div>

            <div className="mt-6 space-y-3">
              <div className="h-12 w-full rounded-xl bg-white/5 ring-1 ring-white/10" />
              <div className="h-12 w-full rounded-xl bg-white/5 ring-1 ring-white/10" />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="h-11 rounded-xl bg-white/5 ring-1 ring-white/10" />
              <div className="h-11 rounded-xl bg-white/5 ring-1 ring-white/10" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isBusy = busy !== null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between">
          <GoToMainButton />
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold ring-1 ring-white/10">
            Auth Test
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {user ? "Connexion réussie" : "Pas connecté"}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                {user
                  ? "Votre session est active côté Supabase."
                  : "Choisissez une méthode pour vous connecter."}
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold ring-1 ring-white/10">
              <span
                className={[
                  "h-2.5 w-2.5 rounded-full",
                  user ? "bg-emerald-400" : "bg-amber-400",
                ].join(" ")}
              />
              <span className="text-slate-200">
                {user ? "Connecté" : "Déconnecté"}
              </span>
            </div>
          </div>

          {/* Error */}
          {err ? (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <div className="text-sm font-bold text-red-100">Erreur</div>
              <div className="mt-1 text-sm text-red-100/90 break-words">
                {err}
              </div>
            </div>
          ) : null}

          {/* Content */}
          {user ? (
            <>
              {/* User info */}
              <div className="mt-5 space-y-3">
                <div className="flex items-start justify-between gap-3 rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                  <div className="text-xs font-medium text-slate-300">
                    Email
                  </div>
                  <div className="text-sm font-semibold text-slate-100 break-words text-right">
                    {email || "—"}
                  </div>
                </div>

                <div className="flex items-start justify-between gap-3 rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                  <div className="text-xs font-medium text-slate-300">
                    User ID
                  </div>
                  <div className="text-sm font-semibold text-slate-100 break-words text-right font-mono">
                    {user.id}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  className="inline-flex min-w-[160px] items-center justify-center rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-60 disabled:hover:bg-white/5"
                  disabled={isBusy}
                  onClick={() => run("refresh", () => refreshUser())}
                >
                  {busy === "refresh" ? "Refreshing…" : "Refresh user"}
                </button>

                <button
                  className="inline-flex min-w-[160px] items-center justify-center rounded-xl bg-indigo-500/20 px-4 py-2.5 text-sm font-semibold ring-1 ring-indigo-400/30 transition hover:bg-indigo-500/30 disabled:opacity-60 disabled:hover:bg-indigo-500/20"
                  disabled={isBusy}
                  onClick={() => run("logout", () => signOut())}
                >
                  {busy === "logout" ? "Logout…" : "Logout"}
                </button>
              </div>

              {/* Divider */}
              <div className="my-6 h-px w-full bg-white/10" />

              {/* Danger zone */}
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold text-red-100">
                      Danger zone
                    </div>
                    <p className="mt-1 text-sm text-slate-300">
                      Suppression définitive du compte (DB + auth). Utilise
                      l’endpoint{" "}
                      <code className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-mono text-slate-100 ring-1 ring-white/10">
                        /api/account/delete
                      </code>
                      .
                    </p>
                  </div>
                </div>

                <button
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-red-500/15 px-4 py-2.5 text-sm font-extrabold text-red-100 ring-1 ring-red-500/30 transition hover:bg-red-500/25 disabled:opacity-60 disabled:hover:bg-red-500/15"
                  disabled={isBusy}
                  onClick={() => {
                    const ok = confirm(
                      "Supprimer votre compte ?\n\nCette action est définitive."
                    );
                    if (!ok) return;
                    run("delete", () => deleteAccount());
                  }}
                >
                  {busy === "delete" ? "Suppression…" : "Delete account"}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Login buttons */}
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  className="inline-flex min-w-[180px] items-center justify-center rounded-xl bg-indigo-500/20 px-4 py-2.5 text-sm font-semibold ring-1 ring-indigo-400/30 transition hover:bg-indigo-500/30 disabled:opacity-60 disabled:hover:bg-indigo-500/20"
                  disabled={isBusy}
                  onClick={() =>
                    run("google", () => signIn("google", "/auth-test-page"))
                  }
                >
                  {busy === "google" ? "Redirect…" : "Login Google"}
                </button>

                <button
                  className="inline-flex min-w-[180px] items-center justify-center rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-60 disabled:hover:bg-white/5"
                  disabled={isBusy}
                  onClick={() =>
                    run("azure", () => signIn("azure", "/auth-test-page"))
                  }
                >
                  {busy === "azure" ? "Redirect…" : "Login Outlook"}
                </button>
              </div>

              {/* Tip */}
              <div className="mt-5 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-5">
                <div className="text-sm font-extrabold text-emerald-100">
                  Tip
                </div>
                <p className="mt-1 text-sm text-slate-300">
                  Google force le consentement via{" "}
                  <code className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-mono text-slate-100 ring-1 ring-white/10">
                    prompt=consent
                  </code>
                  . Azure force l’UI via{" "}
                  <code className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-mono text-slate-100 ring-1 ring-white/10">
                    prompt=login
                  </code>{" "}
                  (dans ton hook).
                </p>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Page de test — pratique pour valider OAuth + callbacks.
        </div>
      </div>
    </div>
  );
}
