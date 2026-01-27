"use client";

import type React from "react";
import type { JobStatus } from "@/hooks/useJobApplications";

// --- CONSTANTS & UTILS ---

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

// --- BASIC COMPONENTS ---

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
        className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={props.onClose}
      />
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 pointer-events-none">
        <div className="w-full max-w-[560px] rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl pointer-events-auto animate-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <div className="truncate text-lg font-bold text-slate-100">
                {props.title}
              </div>
              {props.subtitle ? (
                <div className="truncate text-xs text-slate-400 mt-1">
                  {props.subtitle}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold ring-1 ring-white/10 hover:bg-white/10 transition-colors"
              onClick={props.onClose}
            >
              Fermer
            </button>
          </div>
          <div>{props.children}</div>
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
          "rounded-md px-2 py-1 text-xs font-semibold transition-all",
          props.value === "left"
            ? "bg-white/10 text-white"
            : "text-slate-400 hover:bg-white/5",
        ].join(" ")}
        onClick={() => props.onChange("left")}
      >
        {props.leftLabel}
      </button>
      <button
        type="button"
        className={[
          "rounded-md px-2 py-1 text-xs font-semibold transition-all",
          props.value === "right"
            ? "bg-white/10 text-white"
            : "text-slate-400 hover:bg-white/5",
        ].join(" ")}
        onClick={() => props.onChange("right")}
      >
        {props.rightLabel}
      </button>
    </div>
  );
}

// --- SPECIFIC MODALS ---

export function AlertModal({
  open,
  title,
  message,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <ModalShell open={open} title={title} onClose={onClose}>
      <div className="text-sm text-slate-300 mb-6">{message}</div>
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          OK, compris
        </button>
      </div>
    </ModalShell>
  );
}

export function ResumeScanModal({
  open,
  status,
  onResume,
  onStop,
  onClose,
}: {
  open: boolean;
  status: string;
  onResume: () => void;
  onStop: () => void;
  onClose: () => void;
}) {
  return (
    <ModalShell open={open} title="Scan en cours détecté" onClose={onClose}>
      <div className="text-sm text-slate-300 mb-6 space-y-2">
        <p>
          Un scan est actuellement{" "}
          <strong className="text-amber-400 uppercase">{status}</strong>.
        </p>
        <p>Que souhaitez-vous faire ?</p>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
        <button
          onClick={() => {
            onStop();
            onClose();
          }}
          className="rounded-lg bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200 ring-1 ring-red-500/20 hover:bg-red-500/20 transition-colors"
        >
          Arrêter le scan
        </button>
        <button
          onClick={() => {
            onResume();
            onClose();
          }}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-colors"
        >
          Reprendre
        </button>
      </div>
    </ModalShell>
  );
}

export function DeleteAccountModal({
  open,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell open={open} title="Supprimer le compte" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl bg-red-500/10 p-4 border border-red-500/20">
          <div className="flex gap-3">
            <div className="text-red-400">
              {/* Icone Danger SVG inline */}
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="text-sm text-red-200">
              <h3 className="font-bold">Attention, action irréversible</h3>
              <p className="mt-1 text-red-200/80">
                Vous êtes sur le point de supprimer définitivement votre compte
                et toutes vos données associées (candidatures, emails, scans).
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-400">
          Voulez-vous vraiment continuer ?
        </p>

        <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg bg-white/5 px-4 py-2 text-xs font-semibold ring-1 ring-white/10 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-red-500/20 hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            {busy ? "Suppression..." : "Confirmer la suppression"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
