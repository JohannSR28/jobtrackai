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

// 🟢 MÀJ COULEURS STATUTS (Pour fond blanc)
export function statusTextClass(s: JobStatus): string {
  switch (s) {
    case "applied":
      return "text-blue-600"; // Plus sombre pour lisibilité sur blanc
    case "offer":
      return "text-emerald-600";
    case "rejection":
      return "text-red-600";
    case "interview":
      return "text-purple-600";
    case "unknown":
    default:
      return "text-gray-400";
  }
}

export function statusDotClass(s: JobStatus): string {
  switch (s) {
    case "applied":
      return "bg-blue-500";
    case "offer":
      return "bg-emerald-500";
    case "rejection":
      return "bg-red-500";
    case "interview":
      return "bg-purple-500";
    case "unknown":
    default:
      return "bg-gray-300";
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
        "absolute z-50 mt-2 w-56 rounded-xl bg-white p-1.5 border border-gray-200 shadow-xl animate-in fade-in zoom-in-95 duration-100",
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
        "w-full rounded-lg px-3 py-2 text-left text-xs font-bold transition-colors",
        props.danger
          ? "text-red-600 hover:bg-red-50 disabled:opacity-50"
          : "text-gray-600 hover:bg-gray-100 hover:text-black disabled:opacity-50",
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
        className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={props.onClose}
      />
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-[500px] rounded-2xl bg-white border border-gray-100 p-6 shadow-2xl pointer-events-auto animate-in zoom-in-95 duration-300 relative">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="min-w-0">
              <div className="gen-typo text-xl tracking-tight text-black">
                {props.title}
              </div>
              {props.subtitle ? (
                <div className="truncate text-sm text-gray-500 font-medium mt-1">
                  {props.subtitle}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="rounded-full p-2 bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-black transition-colors"
              onClick={props.onClose}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
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
    <div className="inline-flex rounded-lg bg-gray-100 p-1 shadow-inner border border-gray-200">
      <button
        type="button"
        className={[
          "rounded-md px-3 py-1.5 text-xs font-bold transition-all duration-200",
          props.value === "left"
            ? "bg-brand-orange text-black shadow-sm" // ICI : Orange
            : "text-gray-500 hover:text-gray-700",
        ].join(" ")}
        onClick={() => props.onChange("left")}
      >
        {props.leftLabel}
      </button>
      <button
        type="button"
        className={[
          "rounded-md px-3 py-1.5 text-xs font-bold transition-all duration-200",
          props.value === "right"
            ? "bg-brand-orange text-black shadow-sm" // ICI : Orange
            : "text-gray-500 hover:text-gray-700",
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
      <div className="text-sm font-medium text-gray-600 mb-8 leading-relaxed whitespace-pre-line">
        {message}
      </div>
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="rounded-xl bg-black px-6 py-3 text-xs font-bold text-white hover:bg-gray-800 transition-colors shadow-lg"
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
    <ModalShell open={open} title="SCAN DETECTED" onClose={onClose}>
      <div className="text-sm text-gray-600 mb-8 space-y-2 font-medium">
        <p>
          Un scan est actuellement{" "}
          <strong className="text-[#ff9f43] uppercase bg-orange-50 px-2 py-0.5 rounded">
            {status}
          </strong>
          .
        </p>
        <p>Que souhaitez-vous faire ?</p>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button
          onClick={() => {
            onStop();
            onClose();
          }}
          className="rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-600 border border-red-100 hover:bg-red-100 transition-colors"
        >
          Arrêter le scan
        </button>
        <button
          onClick={() => {
            onResume();
            onClose();
          }}
          className="rounded-xl bg-[#ff9f43] px-6 py-3 text-xs font-bold text-black shadow-lg shadow-orange-500/20 hover:bg-[#e68e3c] transition-colors"
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
    <ModalShell open={open} title="SUPPRIMER LE COMPTE" onClose={onClose}>
      <div className="space-y-6">
        <div className="rounded-xl bg-red-50 p-4 border border-red-100">
          <div className="flex gap-3">
            <div className="text-red-500 mt-0.5">
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
            <div className="text-sm text-red-800">
              <h3 className="font-bold">Attention, action irréversible</h3>
              <p className="mt-1 text-red-600 font-medium leading-relaxed">
                Vous êtes sur le point de supprimer définitivement votre compte
                et toutes vos données associées (candidatures, emails, scans).
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500 font-medium px-1">
          Voulez-vous vraiment continuer ? Cette action ne peut pas être
          annulée.
        </p>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl bg-white px-5 py-3 text-xs font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-red-500/20 hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {busy ? "Suppression..." : "Confirmer la suppression"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
