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
  MessageSquareWarning,
} from "lucide-react";

type Transaction = {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
  count: number;
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

  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"detailed" | "compact">("compact");
  const [hasMore, setHasMore] = useState(false);

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

  const toggleMode = (mode: "detailed" | "compact") => {
    if (mode === viewMode) return;
    setViewMode(mode);
    setPage(1);
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
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-gray-200 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-white">
          <h2 className="gen-typo text-2xl tracking-tight text-black">
            PARAMÈTRES
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-black transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50">
          {/* Préférences */}
          <section>
            <h3 className="text-xs font-bold uppercase text-gray-500 tracking-widest mb-4">
              Préférences
            </h3>
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-orange/10 rounded-lg text-brand-orange">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-black">Langue</div>
                  <div className="text-xs text-gray-500 font-medium">
                    Langue de l&apos;interface
                  </div>
                </div>
              </div>
              <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                <button
                  onClick={() => setLanguage("fr")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    language === "fr"
                      ? "bg-brand-orange text-black shadow-sm"
                      : "text-gray-600 hover:text-black"
                  }`}
                >
                  FR
                </button>
                <button
                  onClick={() => setLanguage("en")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    language === "en"
                      ? "bg-brand-orange text-black shadow-sm"
                      : "text-gray-600 hover:text-black"
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
              <h3 className="text-xs font-bold uppercase text-gray-500 tracking-widest flex items-center gap-2">
                <Receipt className="w-3 h-3" /> Historique
              </h3>
              <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                <button
                  onClick={() => toggleMode("compact")}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                    viewMode === "compact"
                      ? "bg-brand-orange text-black shadow-sm"
                      : "text-gray-600 hover:text-black"
                  }`}
                  title="Vue Compacte"
                >
                  <Layers className="w-3 h-3" />
                  <span className="hidden sm:inline">Compact</span>
                </button>
                <button
                  onClick={() => toggleMode("detailed")}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                    viewMode === "detailed"
                      ? "bg-brand-orange text-black shadow-sm"
                      : "text-gray-600 hover:text-black"
                  }`}
                  title="Vue Détaillée"
                >
                  <List className="w-3 h-3" />
                  <span className="hidden sm:inline">Détail</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-[300px] shadow-sm">
              {loadingHistory ? (
                <div className="flex-1 flex items-center justify-center text-gray-500 text-sm font-medium">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-brand-orange mr-3" />
                  Chargement...
                </div>
              ) : history.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-500 text-sm font-medium">
                  Aucune transaction.
                </div>
              ) : (
                <div className="flex-1 divide-y divide-gray-100">
                  {history.map((tx) => (
                    <div
                      key={tx.id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-black font-bold">
                            {tx.type === "PURCHASE"
                              ? "Achat Crédits"
                              : tx.type === "BONUS"
                                ? "Bonus Gratuit"
                                : viewMode === "compact"
                                  ? "Scan Groupé"
                                  : "Scan Email"}
                          </span>
                          {tx.count > 1 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-brand-orange/10 text-brand-orange border border-brand-orange/20">
                              {tx.count} items
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono font-medium">
                          {new Date(tx.created_at).toLocaleDateString()} •{" "}
                          {new Date(tx.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          • {tx.description || "Sans description"}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-mono font-bold ${
                          tx.amount > 0 ? "text-green-600" : "text-gray-500"
                        }`}
                      >
                        {tx.amount > 0 ? "+" : ""}
                        {tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-200 bg-white p-3 flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loadingHistory}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent text-gray-600 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-500 font-mono font-bold">
                  Page {page}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore || loadingHistory}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent text-gray-600 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>

          {/* Support */}
          <section>
            <h3 className="text-xs font-bold uppercase text-gray-500 tracking-widest mb-4">
              Support
            </h3>
            <a
              href="mailto:jobtrackerai.assist@gmail.com?subject=Signalement%20de%20problème%20JobTrackAI"
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between group hover:border-brand-orange/40 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-orange/10 rounded-lg text-brand-orange group-hover:bg-brand-orange/20 transition-colors">
                  <MessageSquareWarning className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-black group-hover:text-black transition-colors">
                    Signaler un problème
                  </div>
                  <div className="text-xs text-gray-500 font-medium">
                    Envoyer un mail au support technique
                  </div>
                </div>
              </div>
              <div className="text-gray-400 group-hover:text-brand-orange transition-colors">
                <ChevronRight className="w-5 h-5" />
              </div>
            </a>
          </section>

          {/* Danger Zone */}
          <section className="pb-6">
            <h3 className="text-xs font-bold uppercase text-red-500 tracking-widest mb-4 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" /> Zone de danger
            </h3>
            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-black">Accès Emails</div>
                    <div className="text-xs text-gray-500 font-medium">
                      {isMailConnected ? "Connecté" : "Non connecté"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={onRemoveMailConnection}
                  disabled={!isMailConnected}
                  className="px-3 py-2 text-xs font-bold rounded-lg border border-gray-300 hover:bg-gray-100 text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Révoquer
                </button>
              </div>

              <div className="bg-red-50 rounded-xl border border-red-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg text-red-600">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-red-900">
                      Supprimer le compte
                    </div>
                    <div className="text-xs text-red-600 font-medium">
                      Irréversible
                    </div>
                  </div>
                </div>
                <button
                  onClick={onDeleteAccount}
                  className="px-3 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors shadow-lg shadow-red-900/20"
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
