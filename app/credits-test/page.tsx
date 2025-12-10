// app/credits-test/page.tsx
"use client";

import GoToMainButton from "@/components/go-to-main";
import { useEffect, useState } from "react";

interface BalanceResponse {
  credits: number;
}

interface AddCreditsResponse {
  credits: number;
}

export default function CreditsTestPage() {
  const [credits, setCredits] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);
  const [loadingTopUp, setLoadingTopUp] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    try {
      setError(null);
      setLoadingBalance(true);
      const res = await fetch("/api/credits/balance", {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(
          data.error ?? "Erreur lors de la récupération du solde"
        );
      }

      const data = (await res.json()) as BalanceResponse;
      setCredits(data.credits);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Erreur inconnue lors du solde";
      setError(message);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleTopUp = async () => {
    try {
      setError(null);
      setLoadingTopUp(true);

      const res = await fetch("/api/credits/add-test", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: 1000 }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(
          data.error ?? "Erreur lors de l'ajout de crédits (test)"
        );
      }

      const data = (await res.json()) as AddCreditsResponse;
      setCredits(data.credits);
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : "Erreur inconnue lors de l'ajout de crédits";
      setError(message);
    } finally {
      setLoadingTopUp(false);
    }
  };

  useEffect(() => {
    void fetchBalance();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4">
      <div className="absolute top-4 left-4">
        <GoToMainButton />
      </div>
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Test Crédit – JobTrackAI
          </h1>
          <p className="text-sm text-slate-300">
            Page de test pour visualiser le solde de crédits et simuler un achat
            de 5&nbsp;$ (1000 crédits).
          </p>
        </header>

        {/* Solde utilisateur */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Votre solde actuel</h2>
            <p className="text-sm text-slate-300">
              Somme des crédits achetés (Stripe + bonus) moins les crédits
              consommés par les scans.
            </p>
          </div>

          <div className="text-right">
            {loadingBalance && credits === null ? (
              <p className="text-sm text-slate-400">Chargement du solde…</p>
            ) : (
              <p className="text-3xl font-bold tabular-nums">
                {credits ?? 0} <span className="text-base">crédits</span>
              </p>
            )}
          </div>
        </section>

        {/* Message d'erreur */}
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Carte de prix */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-xl font-semibold">Pack Starter</h3>
              <p className="text-sm text-slate-300">
                Idéal pour tester JobTrackAI sur quelques candidatures.
              </p>

              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-bold">5&nbsp;$</span>
                <span className="text-sm text-slate-400">/ 1000 crédits</span>
              </div>

              <ul className="mt-4 space-y-1 text-sm text-slate-300">
                <li>• Scan d&apos;emails Gmail</li>
                <li>• Détection automatique des emails de candidatures</li>
                <li>• Classement par statut (applied, interview, offer, …)</li>
                <li>• Historique conservé dans votre dashboard</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => void handleTopUp()}
              disabled={loadingTopUp}
              className="mt-6 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors w-full"
            >
              {loadingTopUp
                ? "Ajout des crédits…"
                : "Ajouter 5 $ (1000 crédits)"}
            </button>
          </div>

          {/* Petit récap / debug côté droit */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-3 text-sm text-slate-300">
            <h3 className="text-base font-semibold">Comment ça marche ?</h3>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Le solde est calculé dans la vue{" "}
                <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded">
                  user_balance_view
                </code>
                .
              </li>
              <li>
                Le bouton appelle l&apos;endpoint{" "}
                <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded">
                  POST /api/credits/add-test
                </code>{" "}
                pour ajouter 1000 crédits.
              </li>
              <li>
                Ensuite, la page recharge le solde via{" "}
                <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded">
                  GET /api/credits/balance
                </code>
                .
              </li>
            </ol>
          </div>
        </section>
      </div>
    </main>
  );
}
