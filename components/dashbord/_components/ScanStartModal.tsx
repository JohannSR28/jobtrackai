"use client";

import { useState } from "react";
import { ModalShell } from "./ui";
import { useLanguage } from "@/hooks/useLanguage";

const TODAY = new Date().toISOString().split("T")[0];
const ONE_WEEK_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

type ScanConfig = {
  mode: "since_last" | "custom";
  startDate: string;
  endDate: string;
};

const translations = {
  fr: {
    title: "DÉMARRER LE SCAN",
    subtitle: "Synchronisez vos candidatures",
    smartSync: "Smart Sync",
    resumeFrom: "Reprendre depuis le :",
    noPreviousScan: "Aucun scan précédent (défaut: -7 jours)",
    customRange: "Période personnalisée",
    choosePeriod: "Choisir une période spécifique",
    from: "DE",
    to: "À",
    cancel: "Annuler",
    initializing: "Initialisation...",
    startScan: "Démarrer le Scan →",
  },
  en: {
    title: "START MAIL SCAN",
    subtitle: "Sync your applications",
    smartSync: "Smart Sync",
    resumeFrom: "Resume from:",
    noPreviousScan: "No previous scan (default: -7 days)",
    customRange: "Custom Range",
    choosePeriod: "Choose a specific period",
    from: "FROM",
    to: "TO",
    cancel: "Cancel",
    initializing: "Initializing...",
    startScan: "Start Scan →",
  },
};

export function ScanStartModal(props: {
  open: boolean;
  lastScanDate: string | null;
  onClose: () => void;
  onStart: (config: ScanConfig) => void;
  busy: boolean;
}) {
  const { language } = useLanguage();
  const t = translations[language];

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
      title={t.title}
      subtitle={t.subtitle}
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
                {t.smartSync}
              </div>
              <div className="text-xs text-gray-500 font-medium">
                {props.lastScanDate
                  ? `${t.resumeFrom} ${new Date(
                      props.lastScanDate,
                    ).toLocaleDateString(language)}`
                  : t.noPreviousScan}
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
                  {t.customRange}
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  {t.choosePeriod}
                </div>
              </div>
            </div>

            {/* CHAMPS DATE (Visibles uniquement si custom est sélectionné) */}
            {mode === "custom" && (
              <div className="grid grid-cols-2 gap-4 mt-2 pl-7 animate-in slide-in-from-top-1 fade-in duration-200">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    {t.from}
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
                    {t.to}
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
            {t.cancel}
          </button>
          <button
            onClick={handleStart}
            disabled={
              props.busy || (mode === "custom" && (!startDate || !endDate))
            }
            className="rounded-xl bg-black px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
          >
            {props.busy ? t.initializing : t.startScan}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
