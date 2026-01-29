"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// --- TYPES ---
type LinkItem = {
  href: string;
  label: string;
  module?: string;
  status: "done" | "inProgress" | "todo";
};

// --- DATA ---
const UI_PAGES: LinkItem[] = [
  { href: "/landing-page", label: "Landing Page", status: "done" },
  { href: "/login-page", label: "Login Page", status: "done" },
  { href: "/pricing-page", label: "Pricing Page", status: "done" },
];

const FEATURE_PAGES: LinkItem[] = [
  {
    href: "/auth-test-page",
    label: "Authentification Test",
    module: "Module 1",
    status: "done",
  },
  {
    href: "/mail-connection-test-page",
    label: "Mail Connection Test",
    module: "Module 2",
    status: "done",
  },
  {
    href: "/scan-with-time-section-test-page",
    label: "Scan With Time Section Test",
    module: "Module 3 & 4",
    status: "done",
  },
  {
    href: "/ai-analysis-test-page",
    label: "AI Analysis Test",
    module: "Module 5",
    status: "done",
  },
  {
    href: "/dashboard",
    label: "Dashboard (UI Finale)",
    module: "Module 8",
    status: "inProgress",
  },
];

// --- UTILS ---
function getButtonColor(status: LinkItem["status"]) {
  if (status === "done") return "bg-green-600 hover:bg-green-700";
  if (status === "inProgress") return "bg-orange-500 hover:bg-orange-600";
  return "bg-slate-700 hover:bg-slate-800";
}

// --- COMPOSANT MODAL ---
function AccessModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [inputCode, setInputCode] = useState("");
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Vérification simple avec la variable d'environnement
    if (inputCode === process.env.NEXT_PUBLIC_ACCESS_CODE) {
      onSuccess();
      setInputCode(""); // Reset
      setError(false);
    } else {
      setError(true);
      setInputCode(""); // On vide le champ pour qu'il réessaie
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm transform transition-all scale-100">
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          Accès restreint
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Cette page est protégée. Veuillez entrer le code d&apos;accès.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              autoFocus
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.target.value);
                setError(false);
              }}
              placeholder="Code d'accès"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
            {error && (
              <p className="text-red-500 text-xs mt-2 font-medium">
                Code incorrect. Pouvez réessayer le code.
              </p>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium"
            >
              Valider
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- COMPOSANT SECTION ---
function Section({
  title,
  description,
  items,
  onRestrictedClick, // Nouvelle prop optionnelle
}: {
  title: string;
  description: string;
  items: LinkItem[];
  onRestrictedClick?: (href: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="text-left">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600">{description}</p>
      </div>

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={(e) => {
                // Si une fonction de restriction est fournie, on coupe la navigation par défaut
                if (onRestrictedClick) {
                  e.preventDefault();
                  onRestrictedClick(item.href);
                }
              }}
              className={[
                "block w-full px-6 py-3 text-white rounded-lg font-medium transition shadow-sm",
                "flex items-center justify-between gap-4",
                getButtonColor(item.status),
              ].join(" ")}
            >
              <span className="text-left">
                <span className="block">{item.label}</span>
                {item.module ? (
                  <span className="block text-xs text-white/80">
                    {item.module}
                  </span>
                ) : null}
              </span>

              <span className="text-xs font-semibold text-white/90">
                {item.status === "done"
                  ? "DONE"
                  : item.status === "inProgress"
                    ? "IN PROGRESS"
                    : "TODO"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// --- PAGE PRINCIPALE ---
export default function TestPage() {
  const router = useRouter();

  // États pour le modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetLink, setTargetLink] = useState<string | null>(null);

  // Ouvre le modal et stocke le lien visé
  const handleRestrictedClick = (href: string) => {
    setTargetLink(href);
    setIsModalOpen(true);
  };

  // Exécuté quand le code est bon
  const handleCodeSuccess = () => {
    setIsModalOpen(false);
    if (targetLink) {
      router.push(targetLink);
      setTargetLink(null);
    }
  };

  // Fermer le modal sans rien faire
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTargetLink(null);
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      {/* Le Modal (s'affiche par dessus le reste si isOpen est true) */}
      <AccessModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleCodeSuccess}
      />

      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
            Welcome to JobTrackAI
          </h1>
          <p className="mt-4 text-slate-600">
            Hub de navigation: pages UI (visuel) vs pages modules (tests de
            fonctionnalités).
          </p>
        </header>

        {/* UI pages (PAS de restriction ici) */}
        <Section
          title="Pages UI"
          description="Pages purement frontales, sans logique métier."
          items={UI_PAGES}
          // Pas de onRestrictedClick ici, navigation normale
        />

        {/* Feature pages (RESTRICTION ACTIVÉE) */}
        <Section
          title="Modules (Fonctionnalités & Tests)"
          description="Pages de test pour valider l’auth, la connexion mail, les scans, et l’analyse."
          items={FEATURE_PAGES}
          onRestrictedClick={handleRestrictedClick} // C'est ici qu'on active la sécurité
        />
      </div>
    </main>
  );
}
