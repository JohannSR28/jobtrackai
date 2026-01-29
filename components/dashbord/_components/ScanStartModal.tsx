"use client";

import { ModalShell } from "./ui";

type ScanMode = "since_last" | "custom";

export function ScanStartModal(props: {
  open: boolean;
  mode: ScanMode;
  startDate: string;
  setMode: (m: ScanMode) => void;
  setStartDate: (v: string) => void;
  onClose: () => void;
  onStart: () => void;
}) {
  return (
    <ModalShell
      open={props.open}
      title="START SCAN"
      subtitle="Choose synchronization mode"
      onClose={props.onClose}
    >
      <div className="space-y-5 text-sm">
        <div className="space-y-3">
          {/* Option 1: Since Last */}
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all duration-200 ${
              props.mode === "since_last"
                ? "border-brand-orange bg-brand-orange/5 shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="scanMode"
              className="accent-brand-orange w-4 h-4"
              checked={props.mode === "since_last"}
              onChange={() => props.setMode("since_last")}
            />
            <div>
              <div className="font-bold text-black text-sm">Smart Resume</div>
              <div className="text-xs text-gray-500 font-medium">
                Reprendre depuis la dernière fois
              </div>
            </div>
          </label>

          {/* Option 2: Custom */}
          <label
            className={`flex flex-col gap-3 rounded-xl border p-4 transition-all duration-200 ${
              props.mode === "custom"
                ? "border-brand-orange bg-brand-orange/5 shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="scanMode"
                className="accent-brand-orange w-4 h-4"
                checked={props.mode === "custom"}
                onChange={() => props.setMode("custom")}
              />
              <div>
                <div className="font-bold text-black text-sm">Custom Date</div>
                <div className="text-xs text-gray-500 font-medium">
                  Reprendre depuis une date précise
                </div>
              </div>
            </div>

            {props.mode === "custom" && (
              <div className="mt-2 pl-7 animate-in slide-in-from-top-1 fade-in duration-200">
                <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                  Start Date
                </div>
                <input
                  type="date"
                  className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm font-medium text-black outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
                  value={props.startDate}
                  onChange={(e) => props.setStartDate(e.target.value)}
                />
              </div>
            )}
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
            onClick={props.onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="rounded-xl bg-black px-6 py-2 text-xs font-bold text-white shadow-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            disabled={props.mode === "custom" && !props.startDate}
            onClick={props.onStart}
          >
            Start Scan
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
