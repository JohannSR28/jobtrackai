"use client";

import type React from "react";
import type { JobStatus } from "@/hooks/useJobApplications";
export const JOB_STATUS: ReadonlyArray<JobStatus> = [
  "applied",
  "interview",
  "rejection",
  "offer",
  "unknown",
] as const;

export function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export function statusTextClass(s: JobStatus): string {
  switch (s) {
    case "applied":
      return "text-blue-300";
    case "offer":
      return "text-emerald-300";
    case "rejection":
      return "text-red-300";
    case "interview":
      return "text-orange-300";
    case "unknown":
    default:
      return "text-violet-300";
  }
}

export function statusDotClass(s: JobStatus): string {
  switch (s) {
    case "applied":
      return "bg-blue-400";
    case "offer":
      return "bg-emerald-400";
    case "rejection":
      return "bg-red-400";
    case "interview":
      return "bg-orange-400";
    case "unknown":
    default:
      return "bg-violet-400";
  }
}

export function Dropdown(props: {
  open: boolean;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  if (!props.open) return null;
  return (
    <div
      className={[
        "absolute z-50 mt-2 w-56 rounded-xl bg-slate-950/95 p-1 ring-1 ring-white/15 shadow-lg backdrop-blur",
        props.align === "left" ? "left-0" : "right-0",
      ].join(" ")}
    >
      {props.children}
    </div>
  );
}

export function MenuItem(props: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={[
        "w-full rounded-lg px-3 py-2 text-left text-xs font-semibold",
        props.danger
          ? "text-red-100 hover:bg-red-500/15 disabled:opacity-60"
          : "text-slate-100 hover:bg-white/10 disabled:opacity-60",
      ].join(" ")}
    >
      {props.label}
    </button>
  );
}

export function ModalShell(props: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!props.open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-[70] bg-black/50"
        onClick={props.onClose}
      />
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-3">
        <div className="w-full max-w-[560px] rounded-2xl bg-slate-950/95 p-4 ring-1 ring-white/15 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold text-slate-100">
                {props.title}
              </div>
              {props.subtitle ? (
                <div className="truncate text-xs text-slate-400">
                  {props.subtitle}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold ring-1 ring-white/10 hover:bg-white/10"
              onClick={props.onClose}
            >
              Close
            </button>
          </div>
          <div className="mt-3">{props.children}</div>
        </div>
      </div>
    </>
  );
}

export function ToggleMini(props: {
  leftLabel: string;
  rightLabel: string;
  value: "left" | "right";
  onChange: (v: "left" | "right") => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-white/5 ring-1 ring-white/10 p-0.5">
      <button
        type="button"
        className={[
          "rounded-md px-2 py-1 text-xs font-semibold",
          props.value === "left" ? "bg-white/10" : "hover:bg-white/10",
        ].join(" ")}
        onClick={() => props.onChange("left")}
      >
        {props.leftLabel}
      </button>
      <button
        type="button"
        className={[
          "rounded-md px-2 py-1 text-xs font-semibold",
          props.value === "right" ? "bg-white/10" : "hover:bg-white/10",
        ].join(" ")}
        onClick={() => props.onChange("right")}
      >
        {props.rightLabel}
      </button>
    </div>
  );
}
