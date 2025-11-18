"use client";

import { useEffect, useRef } from "react";
import { useScanFunctional } from "@/hooks/useScan";
import GoToMainButton from "@/components/go-to-main";

export default function ScanTestPage() {
  const {
    scanId,
    status,
    loading,
    error,
    initScan,
    startScan,
    stopScan,
    getStatus,
  } = useScanFunctional();

  // Ref pour le polling
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 🔁 Polling automatique toutes les 5 secondes
  useEffect(() => {
    const statusValue = status?.status;

    // On poll :
    // - tant qu'on ne connaît pas encore le statut (status == null)
    // - ou tant que le scan est en cours (pending/running)
    const shouldPoll =
      status == null || statusValue === "pending" || statusValue === "running";

    // Si on ne doit plus poll → on nettoie
    if (!shouldPoll) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    // Évite de recréer plusieurs intervals
    if (pollRef.current) return;

    // On lance l'intervalle
    pollRef.current = setInterval(() => {
      getStatus().catch((err) => {
        console.error("[ScanTest] getStatus polling error:", err);
      });
    }, 5000);

    // Cleanup à l'unmount / changement de condition
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [status, getStatus]);

  // Optionnel : on peut faire un premier getStatus au mount pour avoir un état initial
  useEffect(() => {
    getStatus().catch((err) =>
      console.error("[ScanTest] initial getStatus error:", err)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handlers
  const handleInit = async () => {
    try {
      const res = await initScan();
      console.log("[ScanTest] initScan:", res);

      // Après un init réussi, on synchronise le status
      await getStatus().catch((err) =>
        console.error("[ScanTest] getStatus after init error:", err)
      );
    } catch (err) {
      console.error("[ScanTest] initScan error:", err);
    }
  };

  const handleStart = async () => {
    try {
      const res = await startScan();
      console.log("[ScanTest] startScan:", res);

      // On rafraîchit le status après le start
      await getStatus().catch((err) =>
        console.error("[ScanTest] getStatus after start error:", err)
      );
    } catch (err) {
      console.error("[ScanTest] startScan error:", err);
    }
  };

  const handleStatus = async () => {
    try {
      const res = await getStatus();
      console.log("[ScanTest] getStatus:", res);
    } catch (err) {
      console.error("[ScanTest] getStatus error:", err);
    }
  };

  const handleStop = async () => {
    try {
      const res = await stopScan();
      console.log("[ScanTest] stopScan:", res);
      // On force un refresh du dernier log après stop
      await getStatus().catch((err) =>
        console.error("[ScanTest] getStatus after stop error:", err)
      );
    } catch (err) {
      console.error("[ScanTest] stopScan error:", err);
    }
  };

  // -----------------------------------------
  // États dérivés pour les boutons (logique)
  // -----------------------------------------

  const currentStatus = status?.status;

  const hasActiveScan =
    currentStatus === "pending" || currentStatus === "running";

  const hasPendingScan = currentStatus === "pending";

  // Init :
  //  - possible si pas de scan actif (pas pending/running)
  //  - et pas en cours de requête
  const canInit = !loading && !hasActiveScan;

  // Start :
  //  - possible uniquement si un scan a été init → status = "pending"
  const canStart = !loading && hasPendingScan;

  // Status :
  //  - toujours possible (sauf si on est déjà en train de faire une requête)
  const canStatus = !loading;

  // Stop :
  //  - possible s'il y a quelque chose à stopper (pending ou running)
  const canStop = !loading && hasActiveScan;

  return (
    <main className="max-w-xl mx-auto p-6 mt-10 space-y-4 border rounded-lg">
      <GoToMainButton />
      <h1 className="text-xl font-semibold">Panel de test Scan</h1>

      <div className="space-y-1 text-sm">
        <p>
          <strong>scanId :</strong> {scanId ?? "—"}
        </p>
        <p>
          <strong>status :</strong> {currentStatus ?? "—"}
        </p>
        <p>
          <strong>loading :</strong> {loading ? "true" : "false"}
        </p>
        {error && (
          <p className="text-red-600">
            <strong>Erreur :</strong> {error}
          </p>
        )}
      </div>

      {/* Boutons de contrôle */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleInit}
          disabled={!canInit}
          className="px-3 py-1 rounded border disabled:opacity-50"
        >
          Init Scan
        </button>

        <button
          onClick={handleStart}
          disabled={!canStart}
          className="px-3 py-1 rounded border disabled:opacity-50"
        >
          Démarrer Scan
        </button>

        <button
          onClick={handleStatus}
          disabled={!canStatus}
          className="px-3 py-1 rounded border disabled:opacity-50"
        >
          Statut (manuel)
        </button>

        <button
          onClick={handleStop}
          disabled={!canStop}
          className="px-3 py-1 rounded border disabled:opacity-50 text-red-700"
        >
          Stop
        </button>
      </div>

      {/* Affichage brut du dernier log de status */}
      <section className="mt-4">
        <h2 className="text-sm font-semibold mb-1">
          Dernier status (JSON du log)
        </h2>
        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
          {status ? JSON.stringify(status, null, 2) : "// Aucun status encore"}
        </pre>
      </section>
    </main>
  );
}
