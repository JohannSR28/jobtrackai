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
      title="Start scan"
      subtitle="Choose how to scan (prototype)"
      onClose={props.onClose}
    >
      <div className="space-y-3 text-sm text-slate-200">
        <div className="text-xs text-slate-400">
          (You’ll redesign this modal later — for now it just triggers a fake scan.)
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="scanMode"
              checked={props.mode === "since_last"}
              onChange={() => props.setMode("since_last")}
            />
            <span>Reprendre depuis la dernière fois</span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="scanMode"
              checked={props.mode === "custom"}
              onChange={() => props.setMode("custom")}
            />
            <span>Reprendre depuis une date</span>
          </label>

          {props.mode === "custom" ? (
            <div className="mt-2 flex items-center gap-2">
              <div className="text-xs text-slate-400">Date</div>
              <input
                type="date"
                className="rounded-xl bg-slate-950/40 px-3 py-2 text-xs font-semibold ring-1 ring-white/10 outline-none"
                value={props.startDate}
                onChange={(e) => props.setStartDate(e.target.value)}
              />
            </div>
          ) : null}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            className="rounded-xl bg-indigo-500/20 px-3 py-2 text-xs font-semibold ring-1 ring-indigo-400/30 hover:bg-indigo-500/30 disabled:opacity-60"
            disabled={props.mode === "custom" && !props.startDate}
            onClick={props.onStart}
          >
            Start
          </button>

          <button
            type="button"
            className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold ring-1 ring-white/10 hover:bg-white/10"
            onClick={props.onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalShell>
  );
}