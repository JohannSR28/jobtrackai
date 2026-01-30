"use client";

import { type ScanDTO } from "@/hooks/useScanTester";
import { type VisualState } from "@/hooks/useDashboardController";
import { useLanguage } from "@/hooks/useLanguage";

const translations = {
  fr: {
    scanning: "SCAN EN COURS...",
    completed: "TERMINÉ",
    pausing: "PAUSE...",
    stopping: "ARRÊT...",
    resuming: "REPRISE...",
    emails: "emails",
  },
  en: {
    scanning: "SCANNING...",
    completed: "COMPLETED",
    pausing: "PAUSING...",
    stopping: "STOPPING...",
    resuming: "RESUMING...",
    emails: "emails",
  },
};

export function DashboardProgressBar({
  scan,
  visualState,
}: {
  scan: ScanDTO;
  visualState: VisualState;
}) {
  const { language } = useLanguage();
  const t = translations[language];

  const { processedCount, totalCount, errorMessage } = scan;

  const rawRatio = totalCount > 0 ? processedCount / totalCount : 0;
  const rawPercent = Math.round(rawRatio * 100);

  const config = {
    idle: { color: "bg-gray-200", text: "", visible: false },
    running: { color: "bg-blue-600", text: t.scanning, visible: true }, // Bleu
    completed: { color: "bg-emerald-500", text: t.completed, visible: true }, // Vert
    pausing: { color: "bg-amber-400", text: t.pausing, visible: true }, // Jaune
    stopping: { color: "bg-red-500", text: t.stopping, visible: true }, // Rouge
    resuming: { color: "bg-amber-400", text: t.resuming, visible: true }, // Jaune
  };

  const current = config[visualState];

  if (!current.visible) return null;

  // Calcul largeur : 100% seulement si completed, sinon min 5%
  const widthPercentage =
    visualState === "completed" ? 100 : Math.max(5, rawPercent);

  // Détection erreur technique
  const isError = visualState === "idle" && scan.status === "failed";
  if (isError) return null;

  return (
    <div className="mx-auto mb-6 flex max-w-7xl animate-in slide-in-from-top-2 items-center gap-4 px-1 duration-500 relative z-20">
      {/* 🟢 STYLE SHIMMER RESTAURÉ */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
        }
      `}</style>

      <div className="relative flex h-14 flex-1 items-center overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300">
        {/* FOND DE LA BARRE (COULEUR) */}
        <div
          className={`absolute inset-y-0 left-0 overflow-hidden transition-all duration-500 ease-out ${current.color}`}
          style={{ width: `${widthPercentage}%` }}
        >
          {/* 🟢 EFFET SHIMMER (Uniquement quand ça tourne) */}
          {visualState === "running" && (
            <div className="absolute inset-0 w-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          )}
        </div>

        {/* CONTENU TEXTE (Toujours Noir, pas de Spinner) */}
        <div className="relative z-10 flex w-full items-center justify-between px-6 text-xs font-bold text-black">
          <div className="flex items-center gap-4">
            <span className="gen-typo text-sm md:text-base uppercase tracking-[-1px]">
              {current.text}
            </span>

            <span className="hidden border-l border-gray-300 pl-4 text-gray-600 font-medium sm:inline-block">
              {processedCount} / {totalCount} {t.emails}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {errorMessage && visualState === "running" && (
              <span className="max-w-[200px] truncate text-red-600 font-medium bg-white/50 px-2 py-1 rounded">
                {errorMessage}
              </span>
            )}
            {/* Pourcentage */}
            {visualState !== "completed" && (
              <span className="gen-typo text-xl">{rawPercent}%</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
