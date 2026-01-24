"use client";

import { useMemo, useState } from "react";
import { useScanTester } from "@/hooks/useScanTester";
import GoToMainButton from "@/components/go-to-main";

type Mode = "since_last" | "custom";

/**
 * Convertit un couple (date + time) saisi en local vers ISO UTC (Z).
 * - date: "YYYY-MM-DD"
 * - time: "HH:MM" (optionnel)
 */
function toUtcIso(date: string, time?: string) {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return "";

  let hh = 0;
  let mm = 0;
  if (time) {
    const parts = time.split(":").map(Number);
    hh = Number.isFinite(parts[0]) ? parts[0] : 0;
    mm = Number.isFinite(parts[1]) ? parts[1] : 0;
  }

  // Interprété en heure locale, puis converti en UTC via toISOString()
  const local = new Date(y, m - 1, d, hh, mm, 0, 0);
  return local.toISOString();
}

/**
 * End-of-day utile si tu veux inclure toute la journée sélectionnée
 */
function toUtcIsoEndOfDay(date: string) {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return "";
  const local = new Date(y, m - 1, d, 23, 59, 59, 999);
  return local.toISOString();
}

export default function ScanTestPage() {
  const {
    scan,
    initResult,
    init,
    runLoop,
    pause,
    cancel,
    progress,
    error,
    isLooping,
    action,
  } = useScanTester({ delayMs: 200 });

  const [mode, setMode] = useState<Mode>("since_last");

  // Inputs "intuitifs"
  const [startDate, setStartDate] = useState(""); // YYYY-MM-DD
  const [startTime, setStartTime] = useState(""); // HH:MM (optionnel)
  const [endDate, setEndDate] = useState(""); // YYYY-MM-DD
  const [endTime, setEndTime] = useState(""); // HH:MM (optionnel)

  // Choix UX: si tu veux “jusqu’à la fin de la journée” par défaut
  const [endInclusiveDay, setEndInclusiveDay] = useState(true);

  // Valeurs ISO “compatibles back” calculées automatiquement
  const startIso = useMemo(
    () => toUtcIso(startDate, startTime || undefined),
    [startDate, startTime]
  );

  const endIso = useMemo(() => {
    if (!endDate) return "";
    if (endInclusiveDay && !endTime) return toUtcIsoEndOfDay(endDate);
    return toUtcIso(endDate, endTime || undefined);
  }, [endDate, endTime, endInclusiveDay]);

  const rangeError = useMemo(() => {
    if (mode !== "custom") return null;
    if (!startIso || !endIso)
      return "Choisis une date de début et une date de fin.";
    const a = Date.parse(startIso);
    const b = Date.parse(endIso);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return "Dates invalides.";
    if (a > b) return "Le début doit être avant la fin.";
    return null;
  }, [mode, startIso, endIso]);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <GoToMainButton />
      <h1 className="text-xl font-semibold">Scan Tester</h1>

      <div className="p-4 border rounded-lg space-y-3">
        <div className="flex gap-3 items-center">
          <label className="text-sm">Mode</label>
          <select
            className="border rounded px-2 py-1"
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            disabled={isLooping}
          >
            <option value="since_last">since_last</option>
            <option value="custom">custom</option>
          </select>
        </div>

        {mode === "custom" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">Début</div>
                <div className="flex gap-2">
                  <input
                    className="border rounded px-2 py-1 w-full"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={isLooping}
                  />
                  <input
                    className="border rounded px-2 py-1"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    disabled={isLooping}
                  />
                </div>
                <div className="text-xs text-gray-600">
                  ISO: {startIso || "—"}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Fin</div>
                <div className="flex gap-2">
                  <input
                    className="border rounded px-2 py-1 w-full"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={isLooping}
                  />
                  <input
                    className="border rounded px-2 py-1"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    disabled={isLooping}
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={endInclusiveDay}
                    onChange={(e) => setEndInclusiveDay(e.target.checked)}
                    disabled={isLooping || !!endTime} // si endTime est saisi, on n’a pas besoin du mode “fin de journée”
                  />
                  Si aucune heure n’est saisie, prendre la fin de journée
                  (23:59:59)
                </label>

                <div className="text-xs text-gray-600">
                  ISO: {endIso || "—"}
                </div>
              </div>
            </div>

            {rangeError && (
              <div className="text-red-600 text-sm">{rangeError}</div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
            disabled={isLooping || (mode === "custom" && !!rangeError)}
            onClick={async () => {
              try {
                const r =
                  mode === "since_last"
                    ? await init({ mode: "since_last" })
                    : await init({ mode: "custom", startIso, endIso });

                if (r.mode === "invalid") return;

                if (r.mode === "new") {
                  await runLoop(r.scan.id);
                  return;
                }

                const ok = window.confirm(
                  "Un scan existe déjà (running/paused/created).\n\nOK = Continuer ce scan\nAnnuler = Cancel ce scan"
                );

                if (ok) await runLoop(r.scan.id);
                else await cancel(r.scan.id);
              } catch (e: unknown) {
                console.error(e);
              }
            }}
          >
            Init + Run
          </button>

          <button
            className="px-3 py-1 rounded border disabled:opacity-50"
            onClick={pause}
            disabled={!scan}
          >
            Pause
          </button>

          <button
            className="px-3 py-1 rounded border disabled:opacity-50"
            onClick={() => cancel()}
            disabled={!scan}
          >
            Cancel
          </button>
        </div>

        {action && (
          <div className="text-xs text-gray-600">Action: {action}...</div>
        )}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="text-sm">Progress: {(progress * 100).toFixed(0)}%</div>

        <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
          {JSON.stringify(
            {
              initResult,
              scan,
              ui: { startDate, startTime, endDate, endTime },
              computed: { startIso, endIso },
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}
