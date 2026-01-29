"use client";

import { useState, useMemo, useEffect } from "react";
import { useScanTester } from "@/hooks/useScanTester";
import GoToMainButton from "@/components/go-to-main";

// --- TYPES ---
type Mode = "since_last" | "custom";
type VisualState =
  | "idle"
  | "running"
  | "completed"
  | "pausing"
  | "stopping"
  | "resuming";

// --- HELPERS ---
function toUtcIso(date: string) {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toISOString();
}

function toUtcIsoEndOfDay(date: string) {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

function getScanErrorMessage(reason?: string): string {
  switch (reason) {
    case "TOO_MANY_MESSAGES":
      return "⚠️ Trop d'emails (>2000).";
    case "RANGE_TOO_LARGE":
      return "⚠️ Période trop longue (>90j).";
    case "INVALID_RANGE":
      return "⚠️ Date fin < Date début.";
    case "INSUFFICIENT_FUNDS":
      return "⚠️ Crédits insuffisants.";
    default:
      return `Erreur: ${reason}`;
  }
}

// --- VISUAL BAR ---
function VisualBar({
  state,
  progress,
}: {
  state: VisualState;
  progress: number;
}) {
  const config = {
    idle: { color: "bg-gray-200", text: "Prêt", visible: false },
    running: { color: "bg-blue-600", text: "Scanning...", visible: true },
    completed: { color: "bg-emerald-500", text: "Completed", visible: true },
    pausing: { color: "bg-amber-400", text: "Pausing...", visible: true },
    stopping: { color: "bg-red-500", text: "Stopping...", visible: true },
    resuming: { color: "bg-amber-400", text: "Resuming...", visible: true },
  };

  const current = config[state];
  if (!current.visible) return null;

  const widthPercentage =
    state === "completed" ? 100 : Math.max(5, progress * 100);

  return (
    <div className="w-full h-14 bg-gray-100 rounded-xl overflow-hidden relative border border-gray-200 shadow-inner mb-6 transition-all duration-300">
      <div
        className={`h-full transition-all duration-500 ease-out ${current.color}`}
        style={{ width: `${widthPercentage}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-center gap-3">
        {state === "running" && (
          <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
        )}
        {/* 🟢 MODIFICATION : Texte toujours en NOIR (text-black) */}
        <span className="text-sm font-bold uppercase tracking-widest text-black">
          {current.text}{" "}
          {state !== "completed" && `(${Math.round(progress * 100)}%)`}
        </span>
      </div>
    </div>
  );
}

// --- PAGE PRINCIPALE ---
export default function ScanTestPage() {
  const {
    scan,
    init,
    runLoop,
    pause,
    cancel,
    progress,

    isLooping,
  } = useScanTester({ delayMs: 100 });

  const [mode, setMode] = useState<Mode>("since_last");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [visualState, setVisualState] = useState<VisualState>("idle");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const startIso = useMemo(() => toUtcIso(startDate), [startDate]);
  const endIso = useMemo(() => toUtcIsoEndOfDay(endDate), [endDate]);

  // --- HANDLERS ---

  const handleStart = async () => {
    // REPRISE
    if (scan && scan.status === "paused") {
      if (window.confirm("Reprendre le scan ?")) {
        setVisualState("resuming");
        setIsTransitioning(true);
        runLoop(scan.id);
        setTimeout(() => {
          setVisualState("running");
          setIsTransitioning(false);
        }, 1500);
      } else {
        handleStop();
      }
      return;
    }

    // NOUVEAU
    try {
      const config =
        mode === "since_last"
          ? { mode: "since_last" as const }
          : { mode: "custom" as const, startIso, endIso };

      if (mode === "custom" && (!startDate || !endDate)) {
        alert("Dates requises");
        return;
      }

      const r = await init(config);
      if (r.mode === "invalid") {
        alert(getScanErrorMessage(r.validation?.reason));
        return;
      }
      if (r.mode === "insufficient_funds") {
        alert("Fonds insuffisants");
        return;
      }

      setVisualState("running");
      if (r.mode === "new" || r.mode === "existing") {
        runLoop(r.scan.id);
      }
    } catch (e) {
      console.error(e);
      alert("Erreur");
    }
  };

  const handlePause = async () => {
    if (!scan) return;
    setVisualState("pausing");
    setIsTransitioning(true);
    await Promise.all([new Promise((r) => setTimeout(r, 1500)), pause()]);
    setVisualState("idle");
    setIsTransitioning(false);
  };

  const handleStop = async () => {
    if (!scan) return;
    setVisualState("stopping");
    setIsTransitioning(true);
    await Promise.all([
      new Promise((r) => setTimeout(r, 1500)),
      cancel(scan.id),
    ]);
    setVisualState("idle");
    setIsTransitioning(false);
  };

  // --- SYNC AUTOMATIQUE ---
  useEffect(() => {
    if (!scan) return;
    if (isTransitioning) return;

    if (scan.status === "completed") {
      setVisualState("completed");
      setTimeout(() => {
        if (!isLooping && !isTransitioning) setVisualState("idle");
      }, 5000);
      return;
    }

    if (scan.status === "canceled" || scan.status === "failed") {
      setVisualState("idle");
      return;
    }

    if (scan.status === "running" && visualState === "resuming") {
      setVisualState("running");
    }
  }, [scan, scan?.status, isLooping, isTransitioning, visualState]);

  // --- VISIBILITÉ ---
  const isSystemBusy = isTransitioning || isLooping;
  const canClickStart =
    !isSystemBusy || (scan?.status === "paused" && !isLooping);
  const showActions =
    !isTransitioning && (visualState === "running" || isLooping);
  const isPaused = scan?.status === "paused";

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            LABORATOIRE DE SCAN
          </h1>
          <GoToMainButton />
        </div>

        {/* INPUTS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide">
            Configuration
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Mode
              </label>
              <select
                className="w-full p-2 border rounded-lg bg-gray-50 font-medium disabled:opacity-50"
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
                disabled={isSystemBusy || isPaused}
              >
                <option value="since_last">Smart Sync</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            {mode === "custom" && (
              <>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Début
                  </label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-lg disabled:opacity-50"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={isSystemBusy || isPaused}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Fin
                  </label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-lg disabled:opacity-50"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={isSystemBusy || isPaused}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* VISUALISATION */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">
            Simulation UI
          </h2>

          <VisualBar state={visualState} progress={progress} />

          <div className="flex justify-center gap-4 h-12">
            {/* BOUTON SCAN AVEC SPINNER */}
            <button
              onClick={handleStart}
              disabled={!canClickStart}
              className={`
                px-8 rounded-xl font-bold text-white transition-all transform flex items-center gap-3 shadow-lg
                ${
                  !canClickStart
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300" // Gris clair, texte gris
                    : "bg-black hover:bg-gray-800 active:scale-95" // Noir normal
                }
              `}
            >
              {/* 🟢 Indicateur d'activité dans le bouton */}
              {isSystemBusy && (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" />
              )}

              <span>{isPaused ? "Reprendre le Scan" : "Lancer le Scan"}</span>
            </button>

            {/* BOUTONS ACTIONS */}
            {showActions && (
              <>
                <button
                  onClick={handlePause}
                  className="px-6 rounded-xl font-bold bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 active:scale-95 transition-all"
                >
                  Pause
                </button>
                <button
                  onClick={handleStop}
                  className="px-6 rounded-xl font-bold bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 active:scale-95 transition-all"
                >
                  Stop
                </button>
              </>
            )}
          </div>
        </div>

        {/* DEBUG LOGS */}
        <div className="bg-slate-900 p-6 rounded-xl shadow-inner text-slate-300 font-mono text-xs overflow-hidden">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-500 mb-1">Status Technique:</p>
              <div className="bg-slate-800 p-2 rounded border border-slate-700">
                {scan ? (
                  <>
                    <span className="block text-white font-bold">
                      STATUS DB: {scan.status}
                    </span>
                    <span className="block mt-1">
                      MOTEUR:
                      <span
                        className={
                          isLooping
                            ? "text-green-400 font-bold ml-1"
                            : "text-gray-500 ml-1"
                        }
                      >
                        {isLooping ? "LOOPING..." : "STOPPED"}
                      </span>
                    </span>
                    <span className="block text-yellow-500 mt-1">
                      {isTransitioning ? "🔒 UI LOCKED" : ""}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-500">Inactif</span>
                )}
              </div>
            </div>
            <div>{/* Init Logs */}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
