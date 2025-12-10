"use client";

import { useRef, useState } from "react";

export type JobEmailStatus =
  | "applied"
  | "in_review"
  | "interview"
  | "offer"
  | "rejected"
  | "manual";

export interface PrepareResponse {
  scanLogId: string;
  messageIds: string[];
  periodStartTs: number;
  periodEndTs: number;
}

export interface BatchDetail {
  messageId: string;
  status: JobEmailStatus | null;
  saved: boolean;
}

export interface BatchResponse {
  processed: number;
  saved: number;
  details: BatchDetail[];
}

export type ScanPhase = "idle" | "preparing" | "running" | "done" | "error";

const BATCH_SIZE = 20;

interface ScanContext {
  scanLogId: string | null;
  periodStartTs: number | null;
  periodEndTs: number | null;
}

interface ScanProgress {
  total: number;
  processed: number;
  saved: number;
  currentIndex: number;
  batchSize: number;
}

interface ScanFlags {
  cancelRequested: boolean;
}

interface ScanData {
  messageIds: string[];
  lastBatch: BatchResponse | null;
}

interface ScanState {
  phase: ScanPhase;
  context: ScanContext;
  progress: ScanProgress;
  flags: ScanFlags;
  data: ScanData;
  error: string | null;
}

const initialState: ScanState = {
  phase: "idle",
  context: {
    scanLogId: null,
    periodStartTs: null,
    periodEndTs: null,
  },
  progress: {
    total: 0,
    processed: 0,
    saved: 0,
    currentIndex: 0,
    batchSize: BATCH_SIZE,
  },
  flags: {
    cancelRequested: false,
  },
  data: {
    messageIds: [],
    lastBatch: null,
  },
  error: null,
};

export function useScan() {
  const [state, setState] = useState<ScanState>(initialState);
  const cancelRef = useRef(false);

  const progressPercent =
    state.progress.total > 0
      ? Math.round((state.progress.processed / state.progress.total) * 100)
      : 0;

  // ─────────────────────────────────────────────
  //  ACTIONS
  // ─────────────────────────────────────────────

  async function startScan() {
    setState(() => ({
      ...initialState,
      phase: "preparing",
    }));
    cancelRef.current = false;

    try {
      const res = await fetch("/api/scan/prepare-v2");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Erreur /api/scan/prepare-v2 (${res.status}) : ${text || "Unknown"}`
        );
      }

      const data = (await res.json()) as PrepareResponse;

      // Aucun mail à traiter pour cette période
      if (!data.messageIds || data.messageIds.length === 0) {
        setState((prev) => ({
          ...prev,
          phase: "done",
          context: {
            scanLogId: data.scanLogId ?? null,
            periodStartTs: data.periodStartTs ?? null,
            periodEndTs: data.periodEndTs ?? null,
          },
          progress: {
            ...prev.progress,
            total: 0,
            processed: 0,
            saved: 0,
            currentIndex: 0,
          },
          data: {
            ...prev.data,
            messageIds: [],
          },
        }));
        return;
      }

      // On a des messages → on passe en running et on lance le premier batch
      setState((prev) => ({
        ...prev,
        phase: "running",
        context: {
          scanLogId: data.scanLogId,
          periodStartTs: data.periodStartTs,
          periodEndTs: data.periodEndTs,
        },
        progress: {
          ...prev.progress,
          total: data.messageIds.length,
          processed: 0,
          saved: 0,
          currentIndex: 0,
        },
        data: {
          ...prev.data,
          messageIds: data.messageIds,
        },
        error: null,
      }));

      await runNextBatch(data.messageIds, 0, data.scanLogId);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erreur inconnue (prepare)";
      console.error("[useScan] startScan error:", err);
      setState((prev) => ({
        ...prev,
        phase: "error",
        error: msg,
      }));
    }
  }

  async function runNextBatch(
    ids: string[],
    startIndex: number,
    scanLogId: string | null
  ): Promise<void> {
    // Vérifier si on doit stopper
    if (cancelRef.current) {
      setState((prev) => ({
        ...prev,
        phase: "idle",
        flags: { ...prev.flags, cancelRequested: true },
      }));
      return;
    }

    if (startIndex >= ids.length) {
      // Tous les IDs ont été traités
      setState((prev) => ({
        ...prev,
        phase: "done",
      }));
      // Le backend se charge de passer le scan_log à "completed"
      return;
    }

    const batch = ids.slice(startIndex, startIndex + BATCH_SIZE);

    try {
      const res = await fetch("/api/scan/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "gmail",
          messageIds: batch,
          scanLogId, // utilisé côté backend pour mettre à jour le bon scan_log
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Erreur /api/scan/batch (${res.status}) : ${text || "Unknown"}`
        );
      }

      const data = (await res.json()) as BatchResponse;

      setState((prev) => ({
        ...prev,
        data: {
          ...prev.data,
          lastBatch: data,
        },
        progress: {
          ...prev.progress,
          processed: prev.progress.processed + data.processed,
          saved: prev.progress.saved + data.saved,
          currentIndex: startIndex + batch.length,
        },
      }));

      if (!cancelRef.current) {
        await runNextBatch(ids, startIndex + BATCH_SIZE, scanLogId);
      } else {
        setState((prev) => ({
          ...prev,
          phase: "idle",
          flags: { ...prev.flags, cancelRequested: true },
        }));
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erreur inconnue (batch)";
      console.error("[useScan] runNextBatch error:", err);
      setState((prev) => ({
        ...prev,
        phase: "error",
        error: msg,
      }));
    }
  }

  function stopScan() {
    cancelRef.current = true;
    setState((prev) => ({
      ...prev,
      flags: { ...prev.flags, cancelRequested: true },
    }));
  }

  function resetScan() {
    cancelRef.current = false;
    setState(initialState);
  }

  // ─────────────────────────────────────────────
  //  API du hook : peu de champs, bien groupés
  // ─────────────────────────────────────────────

  const { phase, context, progress, flags, data, error } = state;

  const debug = {
    messageIdsPreview: data.messageIds.slice(0, 20),
    messageIdsTotal: data.messageIds.length,
  };

  return {
    phase,
    isIdle: phase === "idle",
    isPreparing: phase === "preparing",
    isRunning: phase === "running",
    isDone: phase === "done",
    context,
    progress: {
      ...progress,
      percent: progressPercent,
    },
    flags,
    lastBatch: data.lastBatch,
    error,
    debug,
    actions: {
      startScan,
      stopScan,
      resetScan,
    },
  };
}
