"use client";

import { useState } from "react";
import { useScanTester } from "@/hooks/useScanTester";
import GoToMainButton from "@/components/go-to-main";

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

  const [mode, setMode] = useState<"since_last" | "custom">("since_last");
  const [startIso, setStartIso] = useState("");
  const [endIso, setEndIso] = useState("");

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
            onChange={(e) => setMode(e.target.value as "since_last" | "custom")}
            disabled={isLooping}
          >
            <option value="since_last">since_last</option>
            <option value="custom">custom</option>
          </select>
        </div>

        {mode === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <input
              className="border rounded px-2 py-1"
              placeholder="startIso (ex: 2025-10-12T00:00:00Z)"
              value={startIso}
              onChange={(e) => setStartIso(e.target.value)}
              disabled={isLooping}
            />
            <input
              className="border rounded px-2 py-1"
              placeholder="endIso (ex: 2025-10-17T00:00:00Z)"
              value={endIso}
              onChange={(e) => setEndIso(e.target.value)}
              disabled={isLooping}
            />
          </div>
        )}

        <div className="flex gap-2">
          <button
            className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
            disabled={isLooping}
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

                // r.mode === "existing"
                const ok = window.confirm(
                  "Un scan existe déjà (running/paused/created).\n\nOK = Continuer ce scan\nAnnuler = Cancel ce scan"
                );

                if (ok) {
                  await runLoop(r.scan.id);
                } else {
                  await cancel(r.scan.id);
                }
              } catch (e: unknown) {
                // le hook gère déjà error sur les autres actions,
                // mais init peut throw si fetch non-ok
                console.error(e);
              }
            }}
          >
            Init + Run
          </button>

          <button
            className="px-3 py-1 rounded border disabled:opacity-50"
            onClick={pause}
            disabled={!scan || isLooping === false ? false : false}
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
          {JSON.stringify({ initResult, scan }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
