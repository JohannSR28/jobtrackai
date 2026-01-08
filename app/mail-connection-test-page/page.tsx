// src/app/test/mail-range/page.tsx
"use client";

import GoToMainButton from "@/components/go-to-main";
import { useMemo, useState } from "react";

type Mode = "since_last" | "custom";

type ValidateOk = {
  ok: true;
  start: string;
  end: string;
  days: number;
  count: number;
  ids: string[];
};

type ValidateKo = {
  ok: false;
  reason: string;
  details?: string;
  start?: string;
  end?: string;
  days?: number;
  count?: number;
};

type ValidateResult = ValidateOk | ValidateKo;

export default function MailRangeTestPage() {
  // ----------------- VALIDATE section state -----------------
  const [vMode, setVMode] = useState<Mode>("since_last");
  const [vStart, setVStart] = useState(() => toLocalInputIso(daysAgo(7)));
  const [vEnd, setVEnd] = useState(() => toLocalInputIso(new Date()));

  const [vBusy, setVBusy] = useState(false);
  const [vErr, setVErr] = useState<string | null>(null);
  const [vResult, setVResult] = useState<ValidateResult | null>(null);

  // ----------------- FETCH section state -----------------
  const [fMode, setFMode] = useState<Mode>("since_last");
  const [fStart, setFStart] = useState(() => toLocalInputIso(daysAgo(7)));
  const [fEnd, setFEnd] = useState(() => toLocalInputIso(new Date()));

  const [fBusy, setFBusy] = useState(false);
  const [fErr, setFErr] = useState<string | null>(null);
  const [fIds, setFIds] = useState<string[]>([]);

  // UI helpers
  const vIds = useMemo(
    () => (vResult && vResult.ok ? vResult.ids : []),
    [vResult]
  );
  const vBadge = useMemo(() => {
    if (!vResult) return null;
    if (vResult.ok)
      return {
        text: "VALID",
        cls: "bg-emerald-100 text-emerald-800 border-emerald-200",
      };
    return {
      text: "INVALID",
      cls: "bg-rose-100 text-rose-800 border-rose-200",
    };
  }, [vResult]);

  async function doValidate() {
    setVBusy(true);
    setVErr(null);
    setVResult(null);

    try {
      const body =
        vMode === "since_last"
          ? {
              mode: "since_last",
              endIso: new Date(fromLocalInputIso(vEnd)).toISOString(),
            }
          : {
              mode: "custom",
              startIso: new Date(fromLocalInputIso(vStart)).toISOString(),
              endIso: new Date(fromLocalInputIso(vEnd)).toISOString(),
            };

      const res = await fetch("/api/mail/range/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);

      setVResult(json.result as ValidateResult);
    } catch (e: unknown) {
      setVErr(e instanceof Error ? e.message : "UNKNOWN_ERROR");
    } finally {
      setVBusy(false);
    }
  }

  async function doFetch() {
    setFBusy(true);
    setFErr(null);
    setFIds([]);

    try {
      // NOTE: ton endpoint /api/mail/range/ids attend startIso/endIso.
      // Pour mode since_last, on passe start = now-7j (en test) pour rester simple.
      // (Si tu veux que since_last soit géré côté backend ici aussi, il faut un second endpoint
      // ou accepter mode dans /ids. Là je respecte tes endpoints actuels.)
      const { startIso, endIso } =
        fMode === "since_last"
          ? {
              startIso: new Date(daysAgo(7)).toISOString(),
              endIso: new Date(fromLocalInputIso(fEnd)).toISOString(),
            }
          : {
              startIso: new Date(fromLocalInputIso(fStart)).toISOString(),
              endIso: new Date(fromLocalInputIso(fEnd)).toISOString(),
            };

      const res = await fetch("/api/mail/range/ids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startIso, endIso }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);

      setFIds((json.ids ?? []) as string[]);
    } catch (e: unknown) {
      setFErr(e instanceof Error ? e.message : "UNKNOWN_ERROR");
    } finally {
      setFBusy(false);
    }
  }

  return (
    <div>
      <GoToMainButton />

      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl p-6 space-y-6">
          {/* Header */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Module 4 — Mail Range Test
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Validation et Fetch séparés. Aucune pagination côté front.
                  Limites: ≤ 90 jours et ≤ 2000 mails.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="rounded-full border px-3 py-1 text-xs text-gray-700 bg-gray-100">
                  Tailwind minimal UI
                </span>
              </div>
            </div>
          </div>

          {/* ===================== SECTION A: VALIDATION ===================== */}
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">A) Validation</h2>

              {vBadge && (
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${vBadge.cls}`}
                >
                  {vBadge.text}
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-gray-600">
              Choisis un mode + dates (si custom), puis valide. Si c’est valide,
              tu récupères aussi la liste des IDs (≤ 2000).
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Mode */}
              <div className="rounded-xl border bg-gray-50 p-4">
                <div className="text-xs font-semibold text-gray-700">Mode</div>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={vMode === "since_last"}
                      onChange={() => setVMode("since_last")}
                    />
                    since_last (backend: fallback 7 jours)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={vMode === "custom"}
                      onChange={() => setVMode("custom")}
                    />
                    custom (dates manuelles)
                  </label>
                </div>
              </div>

              {/* Dates */}
              <div className="rounded-xl border bg-gray-50 p-4 lg:col-span-2">
                <div className="text-xs font-semibold text-gray-700">Dates</div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Start</div>
                    <input
                      className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100"
                      type="datetime-local"
                      value={vStart}
                      onChange={(e) => setVStart(e.target.value)}
                      disabled={vMode === "since_last"}
                    />
                  </div>

                  <div>
                    <div className="text-xs text-gray-600 mb-1">End</div>
                    <input
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      type="datetime-local"
                      value={vEnd}
                      onChange={(e) => setVEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                    disabled={vBusy}
                    onClick={doValidate}
                  >
                    {vBusy ? "Validating..." : "Validate"}
                  </button>

                  <span className="text-xs text-gray-600">
                    (Valide si ≤ 90 jours et ≤ 2000 mails)
                  </span>
                </div>

                {vErr && (
                  <div className="mt-3 text-sm text-red-600">{vErr}</div>
                )}
              </div>
            </div>

            {/* Validation result */}
            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border p-4">
                <div className="text-sm font-semibold">Résultat brut</div>
                <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-gray-50 p-3 text-xs">
                  {vResult ? JSON.stringify(vResult, null, 2) : "—"}
                </pre>
              </div>

              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">
                    IDs retournés (validation)
                  </div>
                  <span className="text-xs text-gray-600">{vIds.length}</span>
                </div>

                {vIds.length === 0 ? (
                  <div className="mt-3 text-sm text-gray-600">
                    Aucun ID (ou validation invalid).
                  </div>
                ) : (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm underline text-gray-800">
                      Voir la liste (jusqu’à 2000)
                    </summary>
                    <div className="mt-3 max-h-64 overflow-auto rounded-lg border bg-gray-50 p-3">
                      <ul className="space-y-1 text-xs">
                        {vIds.map((id) => (
                          <li key={id} className="font-mono">
                            {id}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                )}
              </div>
            </div>
          </section>

          {/* ===================== SECTION B: FETCH ===================== */}
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">B) Fetch IDs</h2>
              <span className="rounded-full border bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 border-blue-200">
                Fetch direct
              </span>
            </div>

            <p className="mt-1 text-sm text-gray-600">
              Ici on teste le fetch séparément. Même logique de mode. En custom:
              utilise tes dates. En since_last: on fetch “7 derniers jours”
              (test).
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Mode */}
              <div className="rounded-xl border bg-gray-50 p-4">
                <div className="text-xs font-semibold text-gray-700">Mode</div>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={fMode === "since_last"}
                      onChange={() => setFMode("since_last")}
                    />
                    since_last (test: 7 jours)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={fMode === "custom"}
                      onChange={() => setFMode("custom")}
                    />
                    custom (dates manuelles)
                  </label>
                </div>
              </div>

              {/* Dates */}
              <div className="rounded-xl border bg-gray-50 p-4 lg:col-span-2">
                <div className="text-xs font-semibold text-gray-700">Dates</div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Start</div>
                    <input
                      className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100"
                      type="datetime-local"
                      value={fStart}
                      onChange={(e) => setFStart(e.target.value)}
                      disabled={fMode === "since_last"}
                    />
                  </div>

                  <div>
                    <div className="text-xs text-gray-600 mb-1">End</div>
                    <input
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      type="datetime-local"
                      value={fEnd}
                      onChange={(e) => setFEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                    disabled={fBusy}
                    onClick={doFetch}
                  >
                    {fBusy ? "Fetching..." : "Fetch IDs"}
                  </button>

                  <span className="text-xs text-gray-600">
                    (Retourne tous les IDs si ≤ 2000, sinon erreur)
                  </span>
                </div>

                {fErr && (
                  <div className="mt-3 text-sm text-red-600">{fErr}</div>
                )}
              </div>
            </div>

            {/* Fetch result */}
            <div className="mt-5 rounded-xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">IDs (fetch)</div>
                <span className="text-xs text-gray-600">{fIds.length}</span>
              </div>

              {fIds.length === 0 ? (
                <div className="mt-3 text-sm text-gray-600">
                  Aucun ID chargé.
                </div>
              ) : (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm underline text-gray-800">
                    Voir la liste (jusqu’à 2000)
                  </summary>
                  <div className="mt-3 max-h-80 overflow-auto rounded-lg border bg-gray-50 p-3">
                    <ul className="space-y-1 text-xs">
                      {fIds.map((id) => (
                        <li key={id} className="font-mono">
                          {id}
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              )}
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Note: ton endpoint{" "}
              <code className="font-mono">/api/mail/range/ids</code> prend{" "}
              <code className="font-mono">startIso/endIso</code>. Pour{" "}
              <code className="font-mono">since_last</code>, la page utilise un
              fallback “7 jours” côté front juste pour tester. Quand tu
              brancheras “last scan date” via checkpoint, tu pourras aussi
              supporter mode côté backend.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ----------------- helpers ----------------- */

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function toLocalInputIso(d: Date) {
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fromLocalInputIso(v: string) {
  return new Date(v);
}
