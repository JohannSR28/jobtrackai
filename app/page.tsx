"use client";

import { useRouter } from "next/navigation";

const LINKS = [
  { label: "Landing Page", href: "/landing-page" },
  { label: "Auth Test Page", href: "/auth-test-page" },
  { label: "Connexion à la boîte mail", href: "/mail-connection" },
  { label: "Scan & Analyse automatique", href: "/scan-and-analyze" },
  { label: "Test Crédit", href: "/credits-test" },
  { label: "Test Candidatures", href: "/application-test" },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-6 text-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
            Welcome to JobTrackAI
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-500">
            Choisis une action pour tester rapidement les différentes
            fonctionnalités de l’application.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LINKS.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => router.push(link.href)}
              className="
                w-full rounded-lg bg-blue-600 px-4 py-3 text-sm sm:text-base
                font-medium text-white shadow-md
                transition
                hover:bg-blue-700
                active:scale-95
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                text-center
              "
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
