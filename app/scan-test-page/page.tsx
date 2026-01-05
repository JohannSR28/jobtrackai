"use client";

import { useMemo, useState } from "react";
import GoToMainButton from "@/components/go-to-main";
import { useAuth } from "@/hooks/useAuth";
import { useScanRunner } from "@/hooks/useScanRunner";
import { useMailConnection } from "@/hooks/useMailConnection";

function prettyProvider(p?: string) {
  if (p === "gmail") return "Gmail";
  if (p === "outlook") return "Outlook";
  return "—";
}

type ScanStatus =
  | "created"
  | "running"
  | "paused"
  | "completed"
  | "canceled"
  | "failed";

function isFinal(status?: ScanStatus) {
  return status === "completed" || status === "canceled" || status === "failed";
}

export default function ScanTestPage() {
  const { user, loading: authLoading } = useAuth();

  const mail = useMailConnection(); // status, loading, lastError, pollStatus()

  const {
    scan,
    progress,
    error,
    isLooping,
    action,
    init,
    runLoop,
    pause,
    cancel,
  } = useScanRunner({ delayMs: 200 });

  const [showRunningModal, setShowRunningModal] = useState(false);

  const pct = useMemo(() => Math.round(progress * 100), [progress]);
  const statusLabel = useMemo(() => scan?.status ?? "—", [scan]);

  // Provider source of truth = mail.status quand connecté, sinon fallback scan.provider
  const providerLabel = useMemo(() => {
    const s = mail.status;
    if (s && "connected" in s && s.connected === true) {
      return prettyProvider((s as { provider?: string }).provider);
    }
    return prettyProvider(scan?.provider);
  }, [mail.status, scan?.provider]);

  // Busy uniquement pour empêcher double clic sur une action unique.
  // On NE bloque PAS Pause/Stop pendant loop, au contraire.
  const busyStart = isLooping; // start bloqué uniquement pendant loop
  const busyPause = action !== null; // évite double pause
  const busyStop = action !== null; // évite double cancel

  const startLabel = useMemo(() => {
    if (isLooping) return "Scan en cours…";
    if (!scan) return "Start";
    if (scan.status === "paused") return "Start (continuer)";
    if (scan.status === "created") return "Start (démarrer)";
    if (scan.status === "running") return "Start";
    if (isFinal(scan.status)) return "Start (nouveau scan)";
    return "Start";
  }, [isLooping, scan]);

  const ensureMailConnected = async () => {
    const st = await mail.pollStatus();
    if (!st) throw new Error("MAIL_STATUS_UNAVAILABLE");

    // st peut être { authenticated:false... } etc
    if (!("authenticated" in st) || st.authenticated !== true) {
      throw new Error("NOT_AUTHENTICATED");
    }
    if (!("connected" in st) || st.connected !== true) {
      throw new Error("MAIL_NOT_CONNECTED");
    }

    // Ici provider = st.provider
    return st;
  };

  const onClickStart = async () => {
    // 0) Si déjà en loop, ignore
    if (isLooping) return;

    try {
      // 1) Provider = mail status (source de vérité)
      await ensureMailConnected();

      // 2) Init (récupère scan actif ou en crée un)
      const { scan: s } = await init();

      // 3) Si scan final => init va normalement créer un nouveau scan (mode="new")
      // mais si jamais backend renvoie un final quand même, on relance init une fois.
      if (isFinal(s.status)) {
        const r2 = await init();
        await runLoop(r2.scan.id);
        return;
      }

      // 4) Logique demandée :
      // - created => run direct
      // - paused  => run direct (continue)
      // - running => modal continue / stop
      if (s.status === "running") {
        setShowRunningModal(true);
        return;
      }

      // created / paused => run direct
      await runLoop(s.id);
    } catch (e) {
      // Le hook expose déjà error pour scan, mais ici on peut aussi afficher mail.lastError.
      // Si tu veux centraliser, tu peux laisser le hook gérer; ici on ne fait rien.
      // (tu as déjà mail.lastError + error sur l'écran)
      console.error(e);
    }
  };

  const onConfirmContinueRunning = async () => {
    setShowRunningModal(false);
    if (!scan) return;
    await runLoop(scan.id);
  };

  const onConfirmStopRunning = async () => {
    setShowRunningModal(false);
    await cancel();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto w-full max-w-3xl px-6 py-10">Loading auth…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto w-full max-w-3xl px-6 py-10">
          <div className="mb-6 flex items-center justify-between">
            <GoToMainButton />
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold ring-1 ring-white/10">
              Scan Test
            </span>
          </div>
          <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-lg font-bold">Pas connecté</div>
            <p className="mt-2 text-sm text-slate-300">
              Connecte-toi d’abord (Google/Azure) via ta page de test auth.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const mailStatusText = (() => {
    const s = mail.status;
    if (!s) return "—";
    if ("authenticated" in s && s.authenticated === false)
      return "not authenticated";
    if (
      "authenticated" in s &&
      s.authenticated === true &&
      "connected" in s &&
      s.connected === false
    )
      return "authenticated, not connected";
    if ("connected" in s && s.connected === true)
      return `connected (${("email" in s ? s.email : null) ?? "—"})`;
    return "—";
  })();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <GoToMainButton />
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold ring-1 ring-white/10">
            Scan Test
          </span>
        </div>

        <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Test Scan v0</h1>
              <p className="mt-1 text-sm text-slate-300">
                3 boutons: Start / Pause / Stop. Provider issu de
                MailConnection.
              </p>

              <div className="mt-2 text-xs text-slate-400">
                Mail:{" "}
                <span className="font-semibold text-slate-200">
                  {mailStatusText}
                </span>
              </div>

              <div className="mt-1 text-xs text-slate-400">
                Provider:{" "}
                <span className="font-semibold text-slate-200">
                  {providerLabel}
                </span>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold ring-1 ring-white/10">
              <span
                className={[
                  "h-2.5 w-2.5 rounded-full",
                  scan?.status === "running"
                    ? "bg-emerald-400"
                    : scan?.status === "paused"
                    ? "bg-amber-400"
                    : scan?.status === "failed"
                    ? "bg-red-400"
                    : scan?.status === "completed"
                    ? "bg-emerald-400"
                    : "bg-slate-400",
                ].join(" ")}
              />
              <span className="text-slate-200">Status: {statusLabel}</span>
            </div>
          </div>

          {/* Errors */}
          {mail.lastError ? (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <div className="text-sm font-bold text-red-100">Mail error</div>
              <div className="mt-1 text-sm text-red-100/90 break-words">
                {mail.lastError}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <div className="text-sm font-bold text-red-100">Scan error</div>
              <div className="mt-1 text-sm text-red-100/90 break-words">
                {error}
              </div>
            </div>
          ) : null}

          {/* Progress */}
          <div className="mt-5 rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Progress</div>
              <div className="text-xs text-slate-300">{pct}%</div>
            </div>

            <div className="mt-3 h-2 w-full rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-white/40 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-300">
              <div>
                <span className="font-semibold text-slate-200">processed:</span>{" "}
                {scan?.processedCount ?? 0}
              </div>
              <div className="text-right">
                <span className="font-semibold text-slate-200">total:</span>{" "}
                {scan?.totalCount ?? 0}
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-400 break-words">
              <span className="font-semibold text-slate-200">scanId:</span>{" "}
              {scan?.id ?? "—"}
            </div>

            <div className="mt-1 text-xs text-slate-400">
              <span className="font-semibold text-slate-200">
                shouldContinue:
              </span>{" "}
              {scan ? String(scan.shouldContinue) : "—"}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="inline-flex min-w-[170px] items-center justify-center rounded-xl bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25 disabled:opacity-60"
              disabled={busyStart}
              onClick={onClickStart}
              title="Start: poll mail status → init → runLoop (created/paused) ou modal (running)"
            >
              {startLabel}
            </button>

            <button
              className="inline-flex min-w-[170px] items-center justify-center rounded-xl bg-amber-500/15 px-4 py-2.5 text-sm font-semibold ring-1 ring-amber-400/25 transition hover:bg-amber-500/25 disabled:opacity-60"
              disabled={!scan || scan.status !== "running" || busyPause}
              onClick={() => pause()}
              title="Pause: stoppe la boucle côté front + met le scan en paused"
            >
              {action === "pause" ? "Pausing…" : "Pause"}
            </button>

            <button
              className="inline-flex min-w-[170px] items-center justify-center rounded-xl bg-red-500/15 px-4 py-2.5 text-sm font-semibold ring-1 ring-red-400/25 transition hover:bg-red-500/25 disabled:opacity-60"
              disabled={!scan || isFinal(scan.status) || busyStop}
              onClick={() => cancel()}
              title="Stop: stoppe la boucle + met canceled + clear ids (côté backend)"
            >
              {action === "cancel" ? "Stopping…" : "Stop"}
            </button>
          </div>

          {/* Notes */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-extrabold text-slate-100">Notes</div>
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-300 space-y-1">
              <li>
                <b>Init</b> renvoie un scan actif (created/running/paused) sinon
                en crée un.
              </li>
              <li>
                <b>Start/Continue</b> appelle{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5">
                  /api/scan/batch
                </code>{" "}
                en boucle tant que{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5">
                  shouldContinue=true
                </code>
                .
              </li>
              <li>
                <b>Pause</b> stoppe la boucle côté front + met le scan en
                paused.
              </li>
              <li>
                <b>Cancel</b> stoppe la boucle + met canceled + clear ids (côté
                backend).
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Page de test — Scan v0 (logique externe).
        </div>
      </div>

      {/* Modal uniquement si scan "running" */}
      {showRunningModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 ring-1 ring-white/10">
            <div className="text-lg font-bold">Scan déjà en cours</div>
            <p className="mt-2 text-sm text-slate-300">
              Un scan est actuellement <b>running</b>. Voulez-vous{" "}
              <b>continuer</b> ou <b>stopper</b> ?
            </p>

            <div className="mt-4 flex gap-3">
              <button
                className="flex-1 rounded-xl bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold ring-1 ring-emerald-400/25 hover:bg-emerald-500/25 disabled:opacity-60"
                onClick={onConfirmContinueRunning}
                disabled={action !== null}
              >
                Continuer
              </button>
              <button
                className="flex-1 rounded-xl bg-red-500/15 px-4 py-2.5 text-sm font-semibold ring-1 ring-red-400/25 hover:bg-red-500/25 disabled:opacity-60"
                onClick={onConfirmStopRunning}
                disabled={action !== null}
              >
                Stop
              </button>
            </div>

            <button
              className="mt-4 w-full rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold ring-1 ring-white/10 hover:bg-white/10"
              onClick={() => setShowRunningModal(false)}
              disabled={action !== null}
            >
              Fermer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
