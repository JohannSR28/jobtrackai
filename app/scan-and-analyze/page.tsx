"use client";

import GoToMainButton from "@/components/go-to-main";
import { useScan, ScanPhase } from "@/hooks/useScan";

const statusLabel: Record<ScanPhase, string> = {
  idle: "En attente",
  preparing: "Préparation (récupération des IDs Gmail...)",
  running: "Scan en cours",
  done: "Terminé",
  error: "Erreur",
};

export default function ScanTestPage() {
  const {
    phase,
    isPreparing,
    isRunning,
    isDone,
    context,
    progress,
    flags,
    lastBatch,
    error,
    debug,
    actions,
  } = useScan();

  const { startScan, stopScan, resetScan } = actions;

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-8">
      <GoToMainButton />

      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Test Scan — Job Emails</h1>
        <p className="text-gray-600">
          Cette page pilote le scan côté front-end (prepare + batch) et affiche
          toutes les informations utiles pour suivre l&apos;évolution du
          backend.
        </p>
      </header>

      {/* Actions principales */}
      <section className="flex gap-3 items-center">
        <button
          onClick={startScan}
          disabled={isPreparing || isRunning}
          className={`px-4 py-2 rounded text-white shadow-md ${
            isPreparing || isRunning
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isPreparing
            ? "Préparation..."
            : isRunning
            ? "Scan en cours..."
            : "Lancer un scan"}
        </button>

        <button
          onClick={stopScan}
          disabled={!isRunning}
          className={`px-4 py-2 rounded text-white shadow-md ${
            !isRunning
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          Stopper le scan
        </button>

        <button
          onClick={resetScan}
          className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Réinitialiser
        </button>
      </section>

      {/* Statut global */}
      <section className="space-y-3">
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Statut :</span>{" "}
          <span
            className={
              phase === "error"
                ? "text-red-600"
                : phase === "done"
                ? "text-green-600"
                : "text-gray-800"
            }
          >
            {statusLabel[phase]}
          </span>
        </p>

        {/* scanLogId + période (debug) */}
        <div className="text-xs text-gray-600 space-y-1">
          <p>
            <span className="font-semibold">scanLogId :</span>{" "}
            <span className="font-mono break-all">
              {context.scanLogId ?? "n/a"}
            </span>
          </p>
          <p>
            <span className="font-semibold">Période :</span>{" "}
            {context.periodStartTs && context.periodEndTs
              ? `${new Date(
                  context.periodStartTs
                ).toLocaleString()} → ${new Date(
                  context.periodEndTs
                ).toLocaleString()}`
              : "n/a"}
          </p>
        </div>

        {/* Barre de progression */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>
              Traités : {progress.processed} / {progress.total}
            </span>
            <span>
              Enregistrés (job emails) : <strong>{progress.saved}</strong>
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-3 bg-indigo-600 transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">{progress.percent}% complété</p>
        </div>

        {/* Infos brutes de contrôle */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="border rounded p-2 bg-gray-50">
            <p className="font-semibold text-gray-700">Total IDs</p>
            <p className="text-gray-900">{progress.total}</p>
          </div>
          <div className="border rounded p-2 bg-gray-50">
            <p className="font-semibold text-gray-700">Index courant</p>
            <p className="text-gray-900">{progress.currentIndex}</p>
          </div>
          <div className="border rounded p-2 bg-gray-50">
            <p className="font-semibold text-gray-700">Batch size</p>
            <p className="text-gray-900">{progress.batchSize}</p>
          </div>
          <div className="border rounded p-2 bg-gray-50">
            <p className="font-semibold text-gray-700">Cancel demandé</p>
            <p className="text-gray-900">
              {flags.cancelRequested ? "Oui" : "Non"}
            </p>
          </div>
        </div>

        {isDone && (
          <p className="text-xs text-green-700">
            ✅ Scan terminé (le backend a marqué le log comme
            &quot;completed&quot; lors du dernier batch).
          </p>
        )}
      </section>

      {/* Dernier batch traité */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">
          Dernier batch traité
        </h2>
        {lastBatch ? (
          <div className="border rounded p-4 bg-gray-50 space-y-2">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">
                Mails traités dans ce batch :
              </span>{" "}
              {lastBatch.processed}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">
                Job emails enregistrés dans ce batch :
              </span>{" "}
              {lastBatch.saved}
            </p>

            <div className="mt-2 max-h-60 overflow-auto border-t pt-2">
              {lastBatch.details.map((d) => (
                <div
                  key={d.messageId}
                  className="flex justify-between items-center text-xs py-1 border-b last:border-b-0"
                >
                  <div className="truncate">
                    <span className="font-mono text-[11px] text-gray-700">
                      {d.messageId}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span
                      className={`px-2 py-0.5 rounded-full ${
                        d.saved
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {d.saved ? "saved" : "ignored"}
                    </span>
                    <span className="text-gray-700">{d.status ?? "n/a"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Aucun batch traité pour l&apos;instant.
          </p>
        )}
      </section>

      {/* Debug / erreurs */}
      {error && (
        <section className="border border-red-200 bg-red-50 text-red-700 p-3 rounded text-sm">
          <p className="font-semibold mb-1">Erreur</p>
          <pre className="whitespace-pre-wrap text-xs">{error}</pre>
        </section>
      )}

      {/* Aperçu des IDs (debug) */}
      {debug.messageIdsTotal > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">
            Aperçu des premiers messageIds (debug)
          </h2>
          <div className="border rounded p-3 bg-gray-50 text-xs max-h-40 overflow-auto">
            {debug.messageIdsPreview.map((id) => (
              <div key={id} className="font-mono text-[11px] text-gray-700">
                {id}
              </div>
            ))}
            {debug.messageIdsTotal > debug.messageIdsPreview.length && (
              <p className="text-gray-500 mt-1">
                ... et {debug.messageIdsTotal - debug.messageIdsPreview.length}{" "}
                autres
              </p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
