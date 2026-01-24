// src/services/scanService.ts

import type { RawMail, MailAnalysisService } from "@/services/ai/mailAnalysis";
import { JobIngestionService } from "@/services/jobDomain/JobIngestionService";

export interface MailReaderApi {
  getRawMailById(
    userId: string,
    provider: MailProvider,
    messageId: string
  ): Promise<RawMail>;
}

export type MailProvider = "gmail" | "outlook";

export type ScanStatus =
  | "created"
  | "running"
  | "paused"
  | "completed"
  | "canceled"
  | "failed";

export type Scan = {
  id: string;
  userId: string;
  provider: MailProvider;

  status: ScanStatus;

  rangeStartAt: string; // ISO
  rangeEndAt: string; // ISO
  cursorAt: string; // ISO

  processedCount: number;
  totalCount: number;

  shouldContinue: boolean;
  errorMessage?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

export type ScanRangeRules = { maxDays: number; maxMessages: number };

export type ValidateRangeResult =
  | {
      ok: true;
      start: string; // ISO
      end: string; // ISO
      days: number;
      count: number; // exact <= 2000
      ids: string[]; // exact list <= 2000 (utile pour debug, mais pas stocké en DB)
    }
  | {
      ok: false;
      reason: "RANGE_TOO_LARGE" | "TOO_MANY_MESSAGES" | "INVALID_RANGE";
      details?: string;
      start?: string;
      end?: string;
      days?: number;
      count?: number; // ex 2001 => ">2000"
    };

export type InitInput =
  | { mode: "since_last"; endIso?: string }
  | { mode: "custom"; startIso: string; endIso: string };

export type InitResult =
  | { mode: "existing"; scan: Scan }
  | { mode: "new"; scan: Scan }
  | { mode: "invalid"; validation: Exclude<ValidateRangeResult, { ok: true }> };

export type BatchResult = { scan: Scan };

export interface ScanRepository {
  findActiveScan(userId: string): Promise<Scan | null>;
  getByIdForUser(userId: string, scanId: string): Promise<Scan | null>;

  create(input: {
    userId: string;
    provider: MailProvider;
    status: ScanStatus;

    rangeStartAt: string;
    rangeEndAt: string;
    cursorAt: string;

    processedCount: number;
    totalCount: number;
    shouldContinue: boolean;
  }): Promise<Scan>;

  update(
    userId: string,
    scanId: string,
    patch: Partial<{
      status: ScanStatus;

      rangeStartAt: string;
      rangeEndAt: string;
      cursorAt: string;

      processedCount: number;
      totalCount: number;
      shouldContinue: boolean;
      errorMessage: string | null;
    }>
  ): Promise<Scan>;

  finalize(
    userId: string,
    scanId: string,
    input: {
      finalStatus: "completed" | "canceled" | "failed";
      errorMessage?: string;
    }
  ): Promise<Scan>;
}

export type MailCheckpoint = {
  userId: string;
  provider: MailProvider;
  lastSuccessAt: string | null; // ISO
};

export interface MailCheckpointRepository {
  get(userId: string, provider: MailProvider): Promise<MailCheckpoint | null>;
  upsertLastSuccessAt(
    userId: string,
    provider: MailProvider,
    lastSuccessAt: string
  ): Promise<void>;
}

/**
 * Ce que le service attend du "Provider layer"
 * (tu as déjà validateRange + getAllMessageIdsInRange)
 */
export interface MailProviderApi {
  validateRange(
    startIso: string,
    endIso: string,
    rules: ScanRangeRules
  ): Promise<ValidateRangeResult>;

  getAllMessageIdsInRange(input: {
    startIso: string;
    endIso: string;
    maxMessages: number; // ici on peut mettre 2000 (ou un cap par batch si tu veux)
  }): Promise<
    { ok: true; ids: string[] } | { ok: false; reason: "TOO_MANY_MESSAGES" }
  >;
}

function isFinal(status: ScanStatus): boolean {
  return status === "completed" || status === "canceled" || status === "failed";
}

function addHoursIso(iso: string, hours: number): string {
  const d = new Date(iso);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

function minIso(aIso: string, bIso: string): string {
  return new Date(aIso) <= new Date(bIso) ? aIso : bIso;
}

function daysBetweenCeil(startIso: string, endIso: string): number {
  const s = new Date(startIso).getTime();
  const e = new Date(endIso).getTime();
  return Math.ceil((e - s) / (24 * 3600 * 1000));
}

function normalizeIsoRange(startIso: string, endIso: string) {
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime())) {
    return { ok: false as const, error: "INVALID_DATE" };
  }
  if (e <= s) return { ok: false as const, error: "END_BEFORE_START" };
  return { ok: true as const, start: s.toISOString(), end: e.toISOString() };
}

export class ScanService {
  private readonly rules: ScanRangeRules;
  private readonly batchHours: number;

  constructor(
    private scans: ScanRepository,
    private checkpoints: MailCheckpointRepository,
    private providerApi: MailProviderApi,

    // nouveaux ajouts pour Module 5
    private mailReader: MailReaderApi,
    private mailAnalysis: MailAnalysisService,

    // module 6 job ingestion
    private jobIngestion: JobIngestionService,

    // fin nouveaux ajouts

    opts?: {
      rules?: ScanRangeRules; // default {90,2000}
      batchHours?: number; // default 24
      sinceLastFallbackDays?: number; // default 7
    }
  ) {
    this.rules = opts?.rules ?? { maxDays: 90, maxMessages: 2000 };
    this.batchHours = opts?.batchHours ?? 24;
    this.sinceLastFallbackDays = opts?.sinceLastFallbackDays ?? 7;
  }

  private readonly sinceLastFallbackDays: number;

  /**
   * INIT (v4)
   * - résout les dates (since_last via checkpoint)
   * - validate range via provider
   * - crée scan (sans message_ids)
   */
  async init(
    userId: string,
    provider: MailProvider,
    input: InitInput
  ): Promise<InitResult> {
    const active = await this.scans.findActiveScan(userId);
    if (active) return { mode: "existing", scan: active };

    const resolved = await this.resolveRange(userId, provider, input);
    if (!resolved.ok) {
      return { mode: "invalid", validation: resolved.validation };
    }

    const { startIso, endIso, totalCount } = resolved;

    const created = await this.scans.create({
      userId,
      provider,
      status: "created",

      rangeStartAt: startIso,
      rangeEndAt: endIso,
      cursorAt: startIso, //  pas arrondi: curseur exact

      processedCount: 0,
      totalCount,
      shouldContinue: totalCount > 0,
    });

    return { mode: "new", scan: created };
  }

  /**
   * RUN BATCH (v4)
   * - fenêtre glissante: [cursorAt, min(cursorAt+24h, rangeEndAt)]
   * - fetch ids via providerApi
   * - traitement fictif
   * - update cursorAt + processedCount
   * - finalize + update checkpoint si terminé
   */
  // RUN BATCH (v4) — fonctionnel + corrige processedCount + cohérence finalize
  async runBatch(userId: string, scanId: string): Promise<BatchResult> {
    const scan = await this.mustGetScan(userId, scanId);

    // Déjà final => no-op
    if (isFinal(scan.status)) return { scan };

    // Reprise auto
    if (scan.status === "paused" || scan.status === "created") {
      await this.scans.update(userId, scanId, { status: "running" });
    }

    const running = await this.mustGetScan(userId, scanId);
    if (running.status !== "running") return { scan: running };

    // Terminé ?
    if (new Date(running.cursorAt) >= new Date(running.rangeEndAt)) {
      await this.scans.update(userId, scanId, {
        processedCount: running.totalCount,
        shouldContinue: false,
        errorMessage: null,
      });

      const finalized = await this.scans.finalize(userId, scanId, {
        finalStatus: "completed",
      });

      await this.checkpoints.upsertLastSuccessAt(
        userId,
        running.provider,
        running.rangeEndAt
      );

      return { scan: finalized };
    }

    // Fenêtre batch (24h glissante)
    const windowStart = running.cursorAt;
    const windowEnd = minIso(
      addHoursIso(windowStart, this.batchHours),
      running.rangeEndAt
    );

    try {
      // Fetch IDs de la fenêtre
      const idsOut = await this.providerApi.getAllMessageIdsInRange({
        startIso: windowStart,
        endIso: windowEnd,
        maxMessages: this.rules.maxMessages,
      });

      if (!idsOut.ok) {
        const failed = await this.scans.finalize(userId, scanId, {
          finalStatus: "failed",
          errorMessage: "TOO_MANY_MESSAGES_IN_BATCH",
        });
        return { scan: failed };
      }

      const ids = idsOut.ids;

      // Rien à traiter: on avance la fenêtre, sinon risque de boucle infinie
      if (ids.length === 0) {
        const shouldContinue =
          new Date(windowEnd) < new Date(running.rangeEndAt);

        const updated = await this.scans.update(userId, scanId, {
          cursorAt: windowEnd,
          shouldContinue,
          errorMessage: null,
        });

        if (!shouldContinue) {
          await this.scans.update(userId, scanId, {
            processedCount: running.totalCount,
            shouldContinue: false,
            errorMessage: null,
          });

          const finalized = await this.scans.finalize(userId, scanId, {
            finalStatus: "completed",
          });

          await this.checkpoints.upsertLastSuccessAt(
            userId,
            running.provider,
            running.rangeEndAt
          );

          return { scan: finalized };
        }

        return { scan: updated };
      }

      let succeeded = 0;
      let localFailed = 0;

      let hasExternalFailure = false;
      let externalFailureMsg: string | null = null;

      for (const id of ids) {
        try {
          const rawMail = await this.mailReader.getRawMailById(
            userId,
            running.provider,
            id
          );

          const analysis = await this.mailAnalysis.analyzeMail(rawMail);

          await this.jobIngestion.ingestAnalyzedMail({
            userId,
            provider: running.provider,
            rawMail,
            analysis,
          });

          succeeded += 1;

          console.log("Processed message:", { id });
        } catch (e: unknown) {
          const msg = this.stringifyError(e);

          //  Si c'est AI/Provider/Supabase => on stoppe le batch et on pause
          if (isRetryableExternalFailure(msg)) {
            hasExternalFailure = true;
            externalFailureMsg = msg;
            break;
          }

          //  Sinon : erreur locale => on skip et on continue
          localFailed += 1;
          console.log("Local message failure (skipped):", { id, error: msg });
        }
      }

      //  Batch échoue uniquement si external failure
      // IMPORTANT: on n'avance pas cursorAt, et on ne change pas processedCount
      if (hasExternalFailure) {
        const paused = await this.scans.update(userId, scanId, {
          status: "paused",
          errorMessage: externalFailureMsg ?? "RETRYABLE_EXTERNAL_FAILURE",
          shouldContinue: true,
        });

        return { scan: paused };
      }

      // BUGFIX: processedCount doit compter les messages "tentés"
      // car on avance cursorAt => ces messages ne seront pas retentés.
      const attempted = succeeded + localFailed;

      const newProcessed = Math.min(
        running.totalCount,
        Math.max(0, running.processedCount) + attempted
      );

      const shouldContinue = new Date(windowEnd) < new Date(running.rangeEndAt);

      const updated = await this.scans.update(userId, scanId, {
        cursorAt: windowEnd,
        processedCount: newProcessed,
        shouldContinue,
        errorMessage: localFailed > 0 ? `LOCAL_FAILED_${localFailed}` : null,
      });

      if (!shouldContinue) {
        // Force cohérence: scan completed => processedCount = totalCount
        await this.scans.update(userId, scanId, {
          processedCount: running.totalCount,
          shouldContinue: false,
          errorMessage: null,
        });

        const finalized = await this.scans.finalize(userId, scanId, {
          finalStatus: "completed",
        });

        await this.checkpoints.upsertLastSuccessAt(
          userId,
          running.provider,
          running.rangeEndAt
        );

        return { scan: finalized };
      }

      return { scan: updated };
    } catch (e: unknown) {
      const msg = this.stringifyError(e);

      // Ici c'est généralement providerApi/getAllMessageIds qui a foiré => external
      const paused = await this.scans.update(userId, scanId, {
        status: "paused",
        errorMessage: msg,
        shouldContinue: true,
        // cursor inchangé car on n'a jamais réussi à compléter le batch
      });

      return { scan: paused };
    }
  }

  async pause(userId: string, scanId: string): Promise<{ scan: Scan }> {
    const scan = await this.mustGetScan(userId, scanId);
    if (scan.status !== "running") return { scan };
    const updated = await this.scans.update(userId, scanId, {
      status: "paused",
    });
    return { scan: updated };
  }

  async cancel(userId: string, scanId: string): Promise<{ scan: Scan }> {
    const scan = await this.mustGetScan(userId, scanId);
    if (isFinal(scan.status)) return { scan };

    const canceled = await this.scans.finalize(userId, scanId, {
      finalStatus: "canceled",
    });

    // pas de checkpoint update si canceled
    return { scan: canceled };
  }

  // ----------------- internals -----------------

  private async resolveRange(
    userId: string,
    provider: MailProvider,
    input: InitInput
  ): Promise<
    | { ok: true; startIso: string; endIso: string; totalCount: number }
    | { ok: false; validation: Exclude<ValidateRangeResult, { ok: true }> }
  > {
    let startRaw: string;
    let endRaw: string;

    if (input.mode === "custom") {
      const norm = normalizeIsoRange(input.startIso, input.endIso);
      if (!norm.ok) {
        return {
          ok: false,
          validation: {
            ok: false,
            reason: "INVALID_RANGE",
            details: norm.error,
          },
        };
      }
      startRaw = norm.start;
      endRaw = norm.end;
    } else {
      // since_last : checkpoint.last_success_at ou fallback now-7days
      const checkpoint = await this.checkpoints.get(userId, provider);
      const endIso = input.endIso
        ? new Date(input.endIso).toISOString()
        : new Date().toISOString();

      const startIso = checkpoint?.lastSuccessAt
        ? new Date(checkpoint.lastSuccessAt).toISOString()
        : (() => {
            const d = new Date();
            d.setDate(d.getDate() - this.sinceLastFallbackDays);
            return d.toISOString();
          })();

      const norm = normalizeIsoRange(startIso, endIso);
      if (!norm.ok) {
        return {
          ok: false,
          validation: {
            ok: false,
            reason: "INVALID_RANGE",
            details: norm.error,
          },
        };
      }
      startRaw = norm.start;
      endRaw = norm.end;
    }

    // validation provider (<=90j, <=2000)
    // (tu peux aussi vérifier days ici côté service pour early fail)
    const days = daysBetweenCeil(startRaw, endRaw);
    if (days > this.rules.maxDays) {
      return {
        ok: false,
        validation: {
          ok: false,
          reason: "RANGE_TOO_LARGE",
          start: startRaw,
          end: endRaw,
          days,
        },
      };
    }

    const validation = await this.providerApi.validateRange(
      startRaw,
      endRaw,
      this.rules
    );
    if (!validation.ok) {
      return { ok: false, validation };
    }

    return {
      ok: true,
      startIso: validation.start,
      endIso: validation.end,
      totalCount: validation.count,
    };
  }

  private async mustGetScan(userId: string, scanId: string): Promise<Scan> {
    const scan = await this.scans.getByIdForUser(userId, scanId);
    if (!scan) throw new Error("SCAN_NOT_FOUND");
    return scan;
  }

  private stringifyError(e: unknown): string {
    if (typeof e === "string") return e;
    if (e instanceof Error) return e.message || "UNKNOWN_ERROR";
    try {
      return JSON.stringify(e);
    } catch {
      return "UNKNOWN_ERROR";
    }
  }
}

// Heuristique MVP :
// si erreur AI / Provider / Supabase => on PAUSE et on n'avance pas le curseur

function isRetryableExternalFailure(msg: string): boolean {
  const m = msg.toLowerCase();

  // AI
  if (
    m.includes("openai") ||
    m.includes("rate limit") ||
    m.includes("quota") ||
    m.includes("timeout") ||
    m.includes("etimedout") ||
    m.includes("econnreset")
  )
    return true;

  // Provider (gmail/outlook)
  if (
    m.includes("gmail") ||
    m.includes("outlook") ||
    m.includes("googleapis") ||
    m.includes("graph.microsoft") ||
    m.includes("429") ||
    m.includes("503")
  )
    return true;

  // Supabase / DB
  if (
    m.includes("supabase") ||
    m.includes("postgrest") ||
    m.includes("jwt") ||
    m.includes("permission") ||
    m.includes("rls") ||
    m.includes("sql")
  )
    return true;

  return false;
}
