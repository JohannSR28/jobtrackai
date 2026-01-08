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

export function useScanTester(opts?: { delayMs?: number }) {
  const delayMs = typeof opts?.delayMs === "number" ? opts.delayMs : 0;

  const [scan, setScan] = useState<ScanDTO | null>(null);
  const [initResult, setInitResult] = useState<InitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isLooping, setIsLooping] = useState(false);
  const [action, setAction] = useState<null | "pause" | "cancel">(null);

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
      //  update state
      setScan(data.scan);
      // update ref immédiatement (évite le bug "il faut cliquer 2 fois")
      scanRef.current = data.scan;
    } else {
      setScan(null);
      scanRef.current = null;
    }

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

  const runLoop = useCallback(
    async (scanId: string) => {
      if (loopRef.current) return; // anti double-run
      loopRef.current = true;
      setIsLooping(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
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

  const pause = useCallback(async () => {
    const s = scanRef.current;
    if (!s) return;

    setError(null);
    setAction("pause");

    try {
      // stop loop côté front puis pause côté back
      stopLoop();

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

  // ✅ cancel accepte un scanId optionnel (utile quand init retourne existing)
  const cancel = useCallback(
    async (scanId?: string) => {
      const current = scanRef.current;
      const id = scanId ?? current?.id;
      if (!id) return;

      setError(null);
      setAction("cancel");

      try {
        stopLoop();

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
    // state
    scan,
    initResult,
    progress,
    error,
    isLooping,
    action,

    // actions
    init,
    runOneBatch,
    runLoop,
    pause,
    cancel,
    stopLoop,
  };
}
