"use client";

import { useState, useCallback } from "react";
import type {
  ScanInitResponse,
  ScanStartResponse,
  ScanStopResponse,
  ScanStatusResponse,
  ScanErrorResponse,
} from "@/types/scan";

type ApiSuccess = { success: true };

// Petit helper bien typé pour toutes les requêtes
async function request<T extends ApiSuccess>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, options);
  const json = (await res.json()) as T | ScanErrorResponse;

  if (typeof json !== "object" || json === null || !("success" in json)) {
    throw new Error("Réponse serveur invalide");
  }

  if (json.success === false) {
    throw new Error(json.error);
  }

  return json as T;
}

// Pour dériver proprement un scanId S'IL existe dans la réponse de status
type StatusWithOptionalScanId = ScanStatusResponse & { scanId?: string };

export function useScanFunctional() {
  // On ne stocke que le STATUS, plus `loading` + `error`
  const [status, setStatus] = useState<ScanStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // scanId devient une simple vue dérivée du dernier status
  const scanId =
    status && (status as StatusWithOptionalScanId).scanId
      ? (status as StatusWithOptionalScanId).scanId!
      : null;

  // ------------------------------------------------------
  // INIT SCAN : crée un nouveau log "pending" pour l'user
  // ------------------------------------------------------
  const initScan = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await request<ScanInitResponse>("/api/scan/init", {
        method: "POST",
      });

      // Ici tu peux éventuellement faire un getStatus() derrière si tu veux
      // synchroniser tout de suite `status` avec le backend.
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ------------------------------------------------------
  // START SCAN : agit sur le scan "pending" côté backend
  // ➜ Aucun scanId envoyé, le backend sait quel scan prendre
  // ------------------------------------------------------
  const startScan = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await request<ScanStartResponse>("/api/scan/start", {
        method: "POST",
      });

      // Optionnel : tu peux ici appeler getStatus() pour rafraîchir
      // mais je garde le hook pur (pas d'appel imbriqué).
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ------------------------------------------------------
  // STOP SCAN : arrête le scan actif de l'utilisateur
  // ------------------------------------------------------
  const stopScan = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await request<ScanStopResponse>("/api/scan/stop", {
        method: "POST",
      });

      // Tu peux décider ici de ne PAS reset le status tout de suite,
      // et laisser getStatus() dire "interrupted" au prochain poll.
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ------------------------------------------------------
  // GET STATUS : demande au backend "c'est quoi l'état ?"
  // ➜ Pas de scanId, c'est le backend qui trouve le bon log
  // ------------------------------------------------------
  const getStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await request<ScanStatusResponse>("/api/scan/status");

      // Exemple de contrat possible côté backend :
      // - success: true
      // - status: "none" | "pending" | "running" | "completed" | ...
      // - (optionnel) scanId: string
      setStatus(data);

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    scanId,
    status,
    loading,
    error,
    initScan,
    startScan,
    stopScan,
    getStatus,
  };
}
