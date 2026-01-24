"use client";

import { useEffect, useMemo } from "react";
import { useMailConnection } from "@/hooks/useMailConnection";
import { useMailActions } from "@/hooks/useMailActions";
import { useAuth } from "@/hooks/useAuth"; // adapte le chemin
import GoToMainButton from "@/components/go-to-main";

type MailProvider = "gmail" | "outlook";

export default function MailConnectionTestPage() {
  const { user, loading: authLoading } = useAuth();
  const { status, loading, lastError, pollStatus, connect } =
    useMailConnection();
  const { latest, fetchLatest, removeConnection } = useMailActions();

  useEffect(() => {
    pollStatus();
  }, [pollStatus]);

  const authProvider = user?.app_metadata?.provider;
  const expectedMailProvider: MailProvider | null =
    authProvider === "google"
      ? "gmail"
      : authProvider === "azure"
      ? "outlook"
      : null;

  const connected = !!(status && status.authenticated && status.connected);
  const canFetch = connected && latest.kind !== "loading";

  const connectLabel = useMemo(() => {
    if (!expectedMailProvider) return "Connect mail (provider inconnu)";
    return expectedMailProvider === "gmail"
      ? "Connect mail (Gmail)"
      : "Connect mail (Outlook)";
  }, [expectedMailProvider]);

  async function onRemoveMail() {
    const res = await removeConnection();
    if (!res.ok) {
      // tu peux afficher res.message si tu veux
      return;
    }
    await pollStatus();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <GoToMainButton />
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold">Mail Test</div>

            {/*  Affiche les 2 emails */}
            <div className="text-sm text-zinc-400 space-y-1">
              <div>
                Auth email:{" "}
                <span className="text-zinc-200">{user?.email ?? "—"}</span>
              </div>
              <div>
                Mail connected email:{" "}
                <span className="text-zinc-200">
                  {status && status.authenticated && status.connected
                    ? status.email
                    : "—"}
                </span>
              </div>
            </div>

            {/* ton status label */}
            <div className="text-sm text-zinc-400 mt-2">
              {authLoading
                ? "Auth loading..."
                : !user
                ? "Not authenticated (login required)"
                : status
                ? status.authenticated
                  ? status.connected
                    ? `Connected: ${status.provider} (${status.email})`
                    : "Authenticated, not connected"
                  : "Not authenticated"
                : "Loading status..."}
            </div>

            {lastError && (
              <div className="text-xs text-red-300 mt-1">{lastError}</div>
            )}
          </div>

          <button
            onClick={pollStatus}
            disabled={loading}
            className="px-3 py-2 rounded-lg text-sm border border-zinc-700 hover:border-zinc-500 disabled:opacity-40"
          >
            {loading ? "Polling..." : "Poll status"}
          </button>
        </div>

        {/* Connect mail: UN SEUL bouton basé sur useAuth */}
        {user && status?.authenticated && !status.connected && (
          <button
            onClick={() => {
              if (expectedMailProvider) connect(expectedMailProvider);
            }}
            disabled={!expectedMailProvider}
            className="px-4 py-2 rounded-lg text-sm border border-zinc-700 hover:border-zinc-500 disabled:opacity-40"
          >
            {connectLabel}
          </button>
        )}

        {/*  Remove mail connection (uniquement si connecté) */}
        <button
          onClick={onRemoveMail}
          disabled={!connected}
          className="px-4 py-2 rounded-lg text-sm border border-zinc-700 hover:border-zinc-500 disabled:opacity-40"
          title={!connected ? "Pas de mail connection à supprimer" : ""}
        >
          Remove mail connection
        </button>

        {/* Fetch latest 5 */}
        <button
          onClick={() => fetchLatest(5)}
          disabled={!canFetch}
          className="px-4 py-2 rounded-lg text-sm border border-zinc-700 hover:border-zinc-500 disabled:opacity-40"
        >
          {latest.kind === "loading" ? "Fetching..." : "Fetch latest 5 emails"}
        </button>

        {/* Output */}
        <pre className="text-xs bg-zinc-900 p-3 rounded border border-zinc-800 whitespace-pre-wrap break-words">
          {latest.kind === "idle" && "No data"}
          {latest.kind === "loading" && "Loading..."}
          {latest.kind === "error" && `Error: ${latest.message}`}
          {latest.kind === "ok" && JSON.stringify(latest.mails, null, 2)}
        </pre>
      </div>
    </div>
  );
}
