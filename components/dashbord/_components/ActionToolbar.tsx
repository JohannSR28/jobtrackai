"use client";

import { IconPause, IconRefresh, IconStop } from "./icons";
import { type VisualState } from "@/hooks/useDashboardController";
import { useLanguage } from "@/hooks/useLanguage";

type ActionToolbarProps = {
  onScanClick: () => void;
  onPause: () => void;
  onStop: () => void;
  onRefresh: () => void;
  onResume: () => void;
  isSystemBusy: boolean;
  visualState: VisualState;
  isScanPaused: boolean;
  loading: boolean;
};

const translations = {
  fr: {
    title: "TABLEAU DE BORD",
    subtitle: "Gérez vos candidatures et synchronisez vos emails.",
    resumeScan: "Reprendre le Scan",
    newScan: "+ Nouveau Scan",
    pauseTooltip: "Mettre en pause",
    stopTooltip: "Arrêter le scan",
    refreshTooltip: "Rafraîchir les données",
  },
  en: {
    title: "DASHBOARD",
    subtitle: "Manage your applications and synchronize your emails.",
    resumeScan: "Resume Scan",
    newScan: "+ New Scan",
    pauseTooltip: "Pause",
    stopTooltip: "Stop scan",
    refreshTooltip: "Refresh data",
  },
};

export function ActionToolbar({
  onScanClick,
  onPause,
  onStop,
  onRefresh,
  isSystemBusy,
  visualState,
  isScanPaused,
  loading,
}: ActionToolbarProps) {
  const { language } = useLanguage();
  const t = translations[language];

  // Le bouton Scan est désactivé (grisé) si le système est occupé.
  const isScanDisabled = isSystemBusy;

  // Les boutons Pause/Stop doivent être visibles quand on scanne ("running").
  const showActions = visualState === "running";

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
      {/* Titre */}
      <div>
        <h1 className="gen-typo text-2xl sm:text-3xl tracking-tight text-black uppercase">
          {t.title}
        </h1>
        <p className="text-sm text-gray-500 font-medium mt-1">{t.subtitle}</p>
      </div>

      {/* Barre d'actions */}
      <div className="flex items-center gap-3 w-full sm:w-auto bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl border border-gray-200/50 shadow-sm animate-in slide-in-from-right-2">
        {/* BOUTON PRINCIPAL (New Scan / Reprendre) */}
        <button
          onClick={onScanClick}
          disabled={isScanDisabled}
          className={`
            flex-1 sm:flex-none rounded-xl px-5 py-2.5 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2
            ${
              isScanDisabled
                ? "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300 shadow-none" // Grisé
                : "bg-brand-orange text-black hover:bg-brand-orange-hover hover:shadow-[0_0_20px_rgba(255,159,67,0.4)] active:scale-95" // Orange
            }
          `}
        >
          {/* SPINNER */}
          {isSystemBusy && (
            <div className="w-3 h-3 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" />
          )}

          {isScanPaused ? t.resumeScan : t.newScan}
        </button>

        {/* BOUTONS CONTEXTUELS (Pause / Stop) */}
        {showActions && (
          <div className="flex gap-2 animate-in fade-in zoom-in duration-200">
            <button
              onClick={onPause}
              className="rounded-xl bg-amber-50 p-2.5 border border-amber-200 hover:bg-amber-100 transition-colors active:scale-95"
              title={t.pauseTooltip}
            >
              <IconPause className="h-4 w-4 text-amber-700" />
            </button>
            <button
              onClick={onStop}
              className="rounded-xl bg-red-50 p-2.5 border border-red-200 hover:bg-red-100 transition-colors active:scale-95"
              title={t.stopTooltip}
            >
              <IconStop className="h-4 w-4 text-red-700" />
            </button>
          </div>
        )}

        {/* Separator */}
        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* BOUTON REFRESH */}
        <button
          onClick={onRefresh}
          disabled={loading || isSystemBusy}
          className="rounded-xl bg-white p-2.5 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors active:scale-95"
          title={t.refreshTooltip}
        >
          <IconRefresh
            className={
              loading
                ? "h-4 w-4 animate-spin text-brand-orange"
                : "h-4 w-4 text-gray-600"
            }
          />
        </button>
      </div>
    </div>
  );
}
