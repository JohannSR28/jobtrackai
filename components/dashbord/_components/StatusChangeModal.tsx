"use client";

import type { JobStatus } from "@/hooks/useJobApplications";
import { ModalShell, statusTextClass, statusDotClass } from "./ui";
import { useLanguage } from "@/hooks/useLanguage";

const translations = {
  fr: {
    title: "CHANGER LE STATUT",
    subtitle: "Sélectionnez une nouvelle étape pour cette candidature",
    current: "Actuel :",
    currentBadge: "ACTUEL",
    cancel: "Annuler",
    confirmMessage: (status: string) =>
      `Êtes-vous sûr de vouloir changer le statut en "${status}" ?`,
  },
  en: {
    title: "CHANGE STATUS",
    subtitle: "Select a new stage for this application",
    current: "Current:",
    currentBadge: "CURRENT",
    cancel: "Cancel",
    confirmMessage: (status: string) =>
      `Are you sure you want to change the status to "${status}"?`,
  },
};

export function StatusChangeModal(props: {
  open: boolean;
  currentStatus: JobStatus;
  onClose: () => void;
  onConfirm: (newStatus: JobStatus) => void;
  busy: boolean;
}) {
  const { language } = useLanguage();
  const t = translations[language];

  const statuses: JobStatus[] = [
    "applied",
    "interview",
    "offer",
    "rejection",
    "unknown",
  ];

  return (
    <ModalShell
      open={props.open}
      title={t.title}
      subtitle={t.subtitle}
      onClose={props.onClose}
    >
      <div className="space-y-6">
        {/* Indicateur du statut actuel */}
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50 p-3 rounded-lg border border-gray-100">
          <span>{t.current}</span>
          <span
            className={[
              "flex items-center gap-1.5 px-2 py-0.5 rounded bg-white border border-gray-200 shadow-sm text-black",
            ].join(" ")}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${statusDotClass(
                props.currentStatus,
              )}`}
            />
            {props.currentStatus}
          </span>
        </div>

        {/* Grille des choix */}
        <div className="grid gap-3">
          {statuses.map((status) => {
            const isCurrent = status === props.currentStatus;

            return (
              <button
                key={status}
                type="button"
                disabled={props.busy || isCurrent}
                onClick={() => {
                  // On garde le confirm window pour la sécurité, comme demandé
                  if (window.confirm(t.confirmMessage(status))) {
                    props.onConfirm(status);
                  }
                }}
                className={[
                  "group flex items-center gap-4 rounded-xl px-4 py-3.5 text-left text-sm font-bold border transition-all duration-200",
                  isCurrent
                    ? "bg-gray-50 border-gray-200 cursor-default opacity-60 grayscale"
                    : "bg-white border-gray-200 hover:border-brand-orange hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]",
                ].join(" ")}
              >
                {/* Dot Visuel */}
                <span
                  className={[
                    "h-3 w-3 rounded-full ring-2 ring-white shadow-sm transition-transform group-hover:scale-110",
                    statusDotClass(status),
                  ].join(" ")}
                />

                {/* Texte du statut */}
                <span
                  className={[
                    "uppercase tracking-wide",
                    isCurrent ? "text-gray-400" : statusTextClass(status),
                  ].join(" ")}
                >
                  {status}
                </span>

                {/* Indicateur (Current) ou Flèche (Hover) */}
                {isCurrent ? (
                  <span className="ml-auto text-[10px] text-gray-400 font-bold bg-gray-200/50 px-2 py-1 rounded">
                    {t.currentBadge}
                  </span>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="ml-auto text-gray-300 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-brand-orange"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Bouton Annuler */}
        <div className="pt-2">
          <button
            type="button"
            className="w-full rounded-xl bg-white px-4 py-3 text-xs font-bold text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-black transition-colors"
            onClick={props.onClose}
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
