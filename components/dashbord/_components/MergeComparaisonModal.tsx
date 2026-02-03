"use client";

import { useState, useEffect } from "react";
import type { Bucket, JobStatus } from "@/hooks/useJobApplications";
import { statusTextClass } from "@/components/dashbord/_components/ui"; // Assure-toi d'avoir cet import ou copie la logique

// 1. Définir la structure des données fusionnées
export type MergeResult = {
  company: string | null;
  position: string | null;
  status: JobStatus;
  notes: string | null;
};

interface MergeComparisonModalProps {
  open: boolean;
  onClose: () => void;
  targetBucket: Bucket | null;
  sourceBucket: Bucket | null;

  // 2. Utiliser le type précis ici
  // (finalData est l'objet fusionné, et la fonction ne retourne rien => void)
  onConfirm: (finalData: MergeResult) => void;

  busy: boolean;
}

// Les clés qu'on veut comparer
type MergeKey = "company" | "position" | "status" | "notes";

export function MergeComparisonModal({
  open,
  onClose,
  targetBucket,
  sourceBucket,
  onConfirm,
  busy,
}: MergeComparisonModalProps) {
  // État pour savoir quelle valeur est sélectionnée (target ou source)
  const [selections, setSelections] = useState<
    Record<MergeKey, "target" | "source">
  >({
    company: "target",
    position: "target",
    status: "target",
    notes: "target",
  });

  // Reset quand on ouvre
  useEffect(() => {
    if (open) {
      setSelections({
        company: "target",
        position: "target",
        status: "target",
        notes: "target",
      });
    }
  }, [open, targetBucket, sourceBucket]);

  if (!open || !targetBucket || !sourceBucket) return null;

  const handleToggle = (key: MergeKey, side: "target" | "source") => {
    setSelections((prev) => ({ ...prev, [key]: side }));
  };

  const handleConfirm = () => {
    // On construit l'objet final basé sur les choix
    const finalData = {
      company:
        selections.company === "target"
          ? targetBucket.app.company
          : sourceBucket.app.company,
      position:
        selections.position === "target"
          ? targetBucket.app.position
          : sourceBucket.app.position,
      status:
        selections.status === "target"
          ? targetBucket.app.status
          : sourceBucket.app.status,
      notes:
        selections.notes === "target"
          ? targetBucket.app.notes
          : sourceBucket.app.notes,
    };
    onConfirm(finalData);
  };

  // Helper pour rendre une cellule de comparaison
  const renderCell = (key: MergeKey, label: string) => {
    const targetVal = targetBucket.app[key] ?? "—";
    const sourceVal = sourceBucket.app[key] ?? "—";
    const isTargetSelected = selections[key] === "target";
    const isSourceSelected = selections[key] === "source";

    return (
      <div className="grid grid-cols-[100px_1fr_1fr] gap-4 items-center py-3 border-b border-gray-100 last:border-0">
        {/* Label */}
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">
          {label}
        </div>

        {/* Target Value (Celle par défaut) */}
        <button
          onClick={() => handleToggle(key, "target")}
          className={`text-left p-3 rounded-xl border-2 transition-all duration-200 text-sm ${
            isTargetSelected
              ? "border-green-500 bg-green-50 text-gray-900 shadow-sm"
              : "border-transparent hover:bg-gray-50 text-gray-500 opacity-60"
          }`}
        >
          {key === "status" ? (
            <span
              className={`${statusTextClass(targetVal as JobStatus)} px-2 py-1 rounded text-xs font-bold`}
            >
              {targetVal}
            </span>
          ) : (
            <span className="font-medium">{targetVal}</span>
          )}
        </button>

        {/* Source Value (Celle qu'on fusionne) */}
        <button
          onClick={() => handleToggle(key, "source")}
          className={`text-left p-3 rounded-xl border-2 transition-all duration-200 text-sm ${
            isSourceSelected
              ? "border-green-500 bg-green-50 text-gray-900 shadow-sm"
              : "border-transparent hover:bg-gray-50 text-gray-500 opacity-60"
          }`}
        >
          {key === "status" ? (
            <span
              className={`${statusTextClass(sourceVal as JobStatus)} px-2 py-1 rounded text-xs font-bold`}
            >
              {sourceVal}
            </span>
          ) : (
            <span className="font-medium">{sourceVal}</span>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gray-50 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Fusionner les candidatures
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Sélectionnez les informations à conserver. Les emails seront
              combinés.
            </p>
          </div>
          {/* Visual Indicator */}
          <div className="flex items-center gap-3 text-sm font-medium text-gray-400">
            <span className="text-green-600 bg-green-100 px-2 py-1 rounded-md">
              Conservé
            </span>
            <span>vs</span>
            <span className="text-gray-400 opacity-50">Supprimé</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto">
          {/* Column Headers */}
          <div className="grid grid-cols-[100px_1fr_1fr] gap-4 mb-4 text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
            <span>Attribut</span>
            <span>Principal (Cible)</span>
            <span>Fusionné (Source)</span>
          </div>

          <div className="space-y-1">
            {renderCell("company", "Entreprise")}
            {renderCell("position", "Poste")}
            {renderCell("status", "Statut")}
            {renderCell("notes", "Notes")}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-black hover:bg-gray-800 shadow-lg shadow-black/20 transition-all active:scale-95 flex items-center gap-2"
          >
            {busy ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Fusion en cours...
              </>
            ) : (
              "Confirmer la Fusion"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
