"use client";

import { useEffect, useState } from "react";
import {
  X,
  Globe,
  Mail,
  Trash2,
  Receipt,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Layers,
  List,
} from "lucide-react";

type Transaction = {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
  count: number; // Nouveau champ pour le mode compact
};

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  onRemoveMailConnection: () => void;
  onDeleteAccount: () => void;
  isMailConnected: boolean;
  language: string;
  setLanguage: (lang: "fr" | "en") => void;
}

export function SettingsDrawer({
  open,
  onClose,
  onRemoveMailConnection,
  onDeleteAccount,
  isMailConnected,
  language,
  setLanguage,
}: SettingsDrawerProps) {
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // États locaux
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"detailed" | "compact">("compact");
  const [hasMore, setHasMore] = useState(false);

  // Charger l'historique quand on change de page ou de mode
  useEffect(() => {
    if (open) {
      setLoadingHistory(true);
      fetch(`/api/wallet/history?page=${page}&mode=${viewMode}`)
        .then((res) => res.json())
        .then((res) => {
          if (res.data) {
            setHistory(res.data);
            setHasMore(res.meta.hasMore);
          }
        })
        .catch((err) => console.error(err))
        .finally(() => setLoadingHistory(false));
    }
  }, [open, page, viewMode]);

  // Reset page quand on change de mode
  const toggleMode = (mode: "detailed" | "compact") => {
    if (mode === viewMode) return;
    setViewMode(mode);
    setPage(1); // Retour page 1
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-950 border-l border-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <h2 className="text-xl font-bold text-slate-100">Paramètres</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Langue */}
          <section>
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-4">
              Préférences
            </h3>
            <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium text-slate-200">Langue</div>
                  <div className="text-xs text-slate-400">
                    Langue de l&apos;interface
                  </div>
                </div>
              </div>
              <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                <button
                  onClick={() => setLanguage("fr")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    language === "fr"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  FR
                </button>
                <button
                  onClick={() => setLanguage("en")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    language === "en"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  EN
                </button>
              </div>
            </div>
          </section>

          {/* Historique */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                <Receipt className="w-3 h-3" /> Historique
              </h3>

              {/* Toggle Mode */}
              <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                <button
                  onClick={() => toggleMode("compact")}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                    viewMode === "compact"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Vue Compacte (Groupée)"
                >
                  <Layers className="w-3 h-3" />
                  <span className="hidden sm:inline">Compact</span>
                </button>
                <button
                  onClick={() => toggleMode("detailed")}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                    viewMode === "detailed"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Vue Détaillée (Tout voir)"
                >
                  <List className="w-3 h-3" />
                  <span className="hidden sm:inline">Détail</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden flex flex-col min-h-[300px]">
              {loadingHistory ? (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500 mr-3" />
                  Chargement...
                </div>
              ) : history.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                  Aucune transaction.
                </div>
              ) : (
                <div className="flex-1 divide-y divide-slate-800/50">
                  {history.map((tx) => (
                    <div
                      key={tx.id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-200 font-medium">
                            {tx.type === "PURCHASE"
                              ? "Achat Crédits"
                              : tx.type === "BONUS"
                                ? "Bonus Gratuit"
                                : viewMode === "compact"
                                  ? "Scan Groupé"
                                  : "Scan Email"}
                          </span>

                          {/* Badge de comptage pour le mode compact */}
                          {tx.count > 1 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {tx.count} items
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(tx.created_at).toLocaleDateString()} •{" "}
                          {new Date(tx.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          • {tx.description || "Sans description"}
                        </span>
                      </div>

                      <span
                        className={`text-sm font-mono font-medium ${
                          tx.amount > 0 ? "text-emerald-400" : "text-slate-400"
                        }`}
                      >
                        {tx.amount > 0 ? "+" : ""}
                        {tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Barre de Pagination */}
              <div className="border-t border-slate-800 bg-slate-950 p-3 flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loadingHistory}
                  className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-400 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-500 font-mono">
                  Page {page}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore || loadingHistory}
                  className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-400 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="pb-6">
            <h3 className="text-xs font-bold uppercase text-red-500/80 tracking-wider mb-4 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" /> Zone de danger
            </h3>
            <div className="space-y-3">
              <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200">
                      Accès Emails
                    </div>
                    <div className="text-xs text-slate-400">
                      {isMailConnected ? "Connecté" : "Non connecté"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={onRemoveMailConnection}
                  disabled={!isMailConnected}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Révoquer
                </button>
              </div>

              <div className="bg-red-950/10 rounded-xl border border-red-900/30 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-900/20 rounded-lg text-red-400">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-red-200">
                      Supprimer le compte
                    </div>
                    <div className="text-xs text-red-400/70">Irréversible</div>
                  </div>
                </div>
                <button
                  onClick={onDeleteAccount}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors shadow-lg shadow-red-900/20"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
