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
  errorMessage?: string | null;
};

type InitResponse = { mode: "existing" | "new"; scan: ScanDTO };
type BatchResponse = { scan: ScanDTO };

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown; details?: unknown };
    if (typeof data?.error === "string") return data.error;
    if (typeof data?.details === "string") return data.details;
  } catch {}
  return `Request failed (${res.status})`;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function isFinalStatus(status: ScanStatus) {
  return status === "completed" || status === "canceled" || status === "failed";
}

export function useScanRunner(opts?: { delayMs?: number }) {
  const delayMs = typeof opts?.delayMs === "number" ? opts.delayMs : 0;

  const [scan, setScan] = useState<ScanDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  // UI states minimaux
  const [isLooping, setIsLooping] = useState(false);
  const [action, setAction] = useState<null | "pause" | "cancel">(null);

  // source of truth
  const scanRef = useRef<ScanDTO | null>(null);
  useEffect(() => {
    scanRef.current = scan;
  }, [scan]);

  const loopRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

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

  const stopLoop = useCallback(() => {
    loopRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLooping(false);
  }, []);

  // init : uniquement appelé quand le user clique Start (ou quand la page le décide)
  const init = useCallback(async (): Promise<InitResponse> => {
    setError(null);

    const res = await fetch("/api/scan/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), // provider déterminé côté backend via connexion mail
    });

    if (!res.ok) throw new Error(await readErrorMessage(res));
    const data = (await res.json()) as InitResponse;

    setScan(data.scan);
    return data;
  }, []);

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

  // Boucle batch "pure": elle n'appelle pas init.
  // On lui passe un scanId (garanti par la page).
  const runLoop = useCallback(
    async (scanId: string) => {
      if (loopRef.current) return;
      loopRef.current = true;
      setIsLooping(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        let current = scanRef.current;

        // Si scan final en mémoire, on ne le force pas : la page décidera de relancer via init()
        if (current && isFinalStatus(current.status)) return;

        while (loopRef.current) {
          const s = await runOneBatch(scanId, controller.signal);
          current = s;

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

  const pause = useCallback(async () => {
    const s = scanRef.current;
    if (!s) return;

    setError(null);
    setAction("pause");
    try {
      stopLoop();

      const res = await fetch("/api/scan/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId: s.id }),
      });

      if (!res.ok) throw new Error(await readErrorMessage(res));
      const data = (await res.json()) as { scan: ScanDTO };
      setScan(data.scan);
    } finally {
      setAction(null);
    }
  }, [stopLoop]);

  const cancel = useCallback(async () => {
    const s = scanRef.current;
    if (!s) return;

    setError(null);
    setAction("cancel");
    try {
      stopLoop();

      const res = await fetch("/api/scan/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId: s.id }),
      });

      if (!res.ok) throw new Error(await readErrorMessage(res));
      const data = (await res.json()) as { scan: ScanDTO };
      setScan(data.scan);
    } finally {
      setAction(null);
    }
  }, [stopLoop]);

  return {
    scan,
    progress,
    error,
    isLooping,
    action,

    init, // renvoie {mode, scan}
    runLoop, // boucle batch sur un scanId (ne fait PAS init)
    pause,
    cancel,
  };
}
