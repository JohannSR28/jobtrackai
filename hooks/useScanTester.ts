"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type MailProvider = "gmail" | "outlook";
type ScanStatus =
  | "created"
  | "running"
  | "paused"
  | "completed"
  | "canceled"
  | "failed";

export type ScanDTO = {
  id: string;
  provider: MailProvider;
  status: ScanStatus;

  processedCount: number;
  totalCount: number;
  shouldContinue: boolean;

  rangeStartAt?: string;
  rangeEndAt?: string;
  cursorAt?: string;

  errorMessage?: string | null;
};

type InitOk = { mode: "existing" | "new"; scan: ScanDTO };
type InitInvalid = {
  mode: "invalid";
  reason: string;
  details?: string;
  start?: string;
  end?: string;
  days?: number;
  count?: number;
};
export type InitResponse = InitOk | InitInvalid;

type BatchResponse = { scan: ScanDTO };

export type InitMode =
  | { mode: "since_last"; endIso?: string }
  | { mode: "custom"; startIso: string; endIso: string };

// --- HELPERS ---

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown; details?: unknown };
    if (typeof data?.details === "string") return data.details;
    if (typeof data?.error === "string") return data.error;
  } catch {}
  return `Request failed (${res.status})`;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function isFinalStatus(status: ScanStatus) {
  return status === "completed" || status === "canceled" || status === "failed";
}

// --- HOOK PRINCIPAL ---

export function useScanTester(opts?: { delayMs?: number }) {
  const delayMs = typeof opts?.delayMs === "number" ? opts.delayMs : 0;

  // States
  const [scan, setScan] = useState<ScanDTO | null>(null);
  const [initResult, setInitResult] = useState<InitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckpoint, setLastCheckpoint] = useState<string | null>(null);

  // Loop Control
  const [isLooping, setIsLooping] = useState(false);
  const [action, setAction] = useState<null | "pause" | "cancel">(null);

  // Refs pour accès synchrone dans les boucles
  const scanRef = useRef<ScanDTO | null>(null);
  useEffect(() => {
    scanRef.current = scan;
  }, [scan]);

  const loopRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // 1. Calcul de la progression
  const progress = useMemo(() => {
    const s = scan;
    if (!s) return 0;

    const done =
      isFinalStatus(s.status) ||
      !s.shouldContinue ||
      (s.totalCount > 0 && s.processedCount >= s.totalCount);

    if (done) return 1;
    if (s.totalCount <= 0) return 0;
    return Math.min(1, Math.max(0, s.processedCount / s.totalCount));
  }, [scan]);

  // 2. Helper pour arrêter la boucle
  const stopLoop = useCallback((immediate: boolean = false) => {
    loopRef.current = false; // Le drapeau tombe : la boucle s'arrêtera au prochain tour
    if (immediate) {
      // Si immédiat (Cancel/Unmount), on tue la requête en cours
      abortRef.current?.abort();
      abortRef.current = null;
      setIsLooping(false);
    }
  }, []);

  // 3. Vérifier s'il y a un scan actif au démarrage (Active Check)
  const refreshScanStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/scan/active");
      if (res.ok) {
        const data = await res.json();
        if (data.scan) {
          setScan(data.scan);
          scanRef.current = data.scan;
        }
      }
    } catch (e) {
      console.error("Failed to check active scan", e);
    }
  }, []);

  // Charger le statut au montage
  useEffect(() => {
    refreshScanStatus();
  }, [refreshScanStatus]);

  // 4. Charger le Checkpoint (Last Success)
  const fetchCheckpoint = useCallback(async () => {
    try {
      const res = await fetch("/api/scan/checkpoint");
      if (res.ok) {
        const data = await res.json();
        setLastCheckpoint(data.lastSuccessAt);
      }
    } catch (e) {
      console.error("Failed to fetch checkpoint", e);
    }
  }, []);

  // 5. Initialiser un nouveau scan (ou récupérer l'existant via API init)
  const init = useCallback(async (input: InitMode): Promise<InitResponse> => {
    setError(null);
    setInitResult(null);

    const res = await fetch("/api/scan/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) throw new Error(await readErrorMessage(res));

    const data = (await res.json()) as InitResponse;
    setInitResult(data);

    if (data.mode === "new" || data.mode === "existing") {
      setScan(data.scan);
      scanRef.current = data.scan;
    } else {
      setScan(null);
      scanRef.current = null;
    }

    return data;
  }, []);

  // 6. Exécuter UN batch
  const runOneBatch = useCallback(
    async (scanId: string, signal?: AbortSignal) => {
      const res = await fetch("/api/scan/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({ scanId }),
      });

      if (!res.ok) throw new Error(await readErrorMessage(res));
      const data = (await res.json()) as BatchResponse;

      setScan(data.scan);
      return data.scan;
    },
    []
  );

  // 7. La Boucle Principale (The Loop)
  const runLoop = useCallback(
    async (scanId: string) => {
      if (loopRef.current) return; // Anti double-clic
      loopRef.current = true;
      setIsLooping(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // Vérif sécu avant de commencer
        const current = scanRef.current;
        if (current && current.id === scanId && isFinalStatus(current.status))
          return;

        while (loopRef.current) {
          const s = await runOneBatch(scanId, controller.signal);

          const done =
            isFinalStatus(s.status) ||
            !s.shouldContinue ||
            s.status === "paused";

          if (done) break;

          if (delayMs > 0) await sleep(delayMs);
        }
      } catch (e: unknown) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          setError(e instanceof Error ? e.message : "UNKNOWN_ERROR");
        }
      } finally {
        abortRef.current = null;
        loopRef.current = false;
        setIsLooping(false);
      }
    },
    [delayMs, runOneBatch]
  );

  // 8. Action : PAUSE (Graceful)
  const pause = useCallback(async () => {
    const s = scanRef.current;
    if (!s) return;

    setError(null);
    setAction("pause");

    try {
      // FALSE ici : on dit à la boucle de s'arrêter mais on n'abort pas la requête en cours
      stopLoop(false);

      const res = await fetch("/api/scan/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId: s.id }),
      });

      if (!res.ok) throw new Error(await readErrorMessage(res));
      const data = (await res.json()) as { scan: ScanDTO };

      setScan(data.scan);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "UNKNOWN_ERROR");
    } finally {
      setAction(null);
    }
  }, [stopLoop]);

  // 9. Action : CANCEL (Hard)
  const cancel = useCallback(
    async (scanId?: string) => {
      const current = scanRef.current;
      const id = scanId ?? current?.id;
      if (!id) return;

      setError(null);
      setAction("cancel");

      try {
        // TRUE ici : on coupe tout immédiatement
        stopLoop(true);

        const res = await fetch("/api/scan/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scanId: id }),
        });

        if (!res.ok) throw new Error(await readErrorMessage(res));
        const data = (await res.json()) as { scan: ScanDTO };
        setScan(data.scan);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "UNKNOWN_ERROR");
      } finally {
        setAction(null);
      }
    },
    [stopLoop]
  );

  return {
    // State
    scan,
    initResult,
    progress,
    error,
    isLooping,
    action,
    lastCheckpoint,

    // Actions
    init,
    runOneBatch,
    runLoop,
    pause,
    cancel,
    stopLoop,
    fetchCheckpoint,
    refreshScanStatus,
  };
}
