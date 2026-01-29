"use client";

import { useState } from "react";
import { ModalShell } from "./ui";

const TODAY = new Date().toISOString().split("T")[0];
const ONE_WEEK_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

type ScanConfig = {
  mode: "since_last" | "custom";
  startDate: string;
  endDate: string;
};

export function ScanStartModal(props: {
  open: boolean;
  lastScanDate: string | null;
  onClose: () => void;
  onStart: (config: ScanConfig) => void;
  busy: boolean;
}) {
  // États locaux
  const [mode, setMode] = useState<"since_last" | "custom">("since_last");
  const [startDate, setStartDate] = useState(ONE_WEEK_AGO);
  const [endDate, setEndDate] = useState(TODAY);

  const handleStart = () => {
    props.onStart({ mode, startDate, endDate });
  };

  return (
    <ModalShell
      open={props.open}
      title="START MAIL SCAN"
      subtitle="Sync your applications"
      onClose={props.onClose}
    >
      <div className="space-y-6 text-sm text-gray-600">
        <div className="space-y-3">
          {/* OPTION 1 : SMART SYNC */}
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all duration-200 ${
              mode === "since_last"
                ? "border-brand-orange bg-brand-orange/5 shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              className="accent-brand-orange w-4 h-4"
              checked={mode === "since_last"}
              onChange={() => setMode("since_last")}
            />
            <div>
              <div className="font-bold text-black text-base mb-1">
                Smart Sync
              </div>
              <div className="text-xs text-gray-500 font-medium">
                {props.lastScanDate
                  ? `Reprendre depuis le : ${new Date(props.lastScanDate).toLocaleDateString()}`
                  : "Aucun scan précédent (défaut: -7 jours)"}
              </div>
            </div>
          </label>

          {/* OPTION 2 : CUSTOM RANGE */}
          <label
            className={`flex flex-col gap-3 cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
              mode === "custom"
                ? "border-brand-orange bg-brand-orange/5 shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                className="accent-brand-orange w-4 h-4 mt-0.5"
                checked={mode === "custom"}
                onChange={() => setMode("custom")}
              />
              <div className="flex-1">
                <div className="font-bold text-black text-base mb-1">
                  Custom Range
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  Choisir une période spécifique
                </div>
              </div>
            </div>

            {/* CHAMPS DATE (Visibles uniquement si custom est sélectionné) */}
            {mode === "custom" && (
              <div className="grid grid-cols-2 gap-4 mt-2 pl-7 animate-in slide-in-from-top-1 fade-in duration-200">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    From
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full cursor-pointer rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm font-medium text-black outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    To
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full cursor-pointer rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm font-medium text-black outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all shadow-sm"
                  />
                </div>
              </div>
            )}
          </label>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          <button
            onClick={props.onClose}
            className="rounded-xl px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={
              props.busy || (mode === "custom" && (!startDate || !endDate))
            }
            className="rounded-xl bg-black px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
          >
            {props.busy ? "Initializing..." : "Start Scan →"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
