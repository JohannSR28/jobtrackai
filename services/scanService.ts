// src/services/scanService.ts

import type { RawMail, MailAnalysisService } from "@/services/ai/mailAnalysis";
import { JobIngestionService } from "@/services/jobDomain/JobIngestionService";
import { TransactionRepository } from "@/repositories/TransactionRepository";

export interface MailReaderApi {
  getRawMailById(
    userId: string,
    provider: MailProvider,
    messageId: string,
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

  // NOUVEAU : Coût accumulé
  tokensCost: number;

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
  | { mode: "invalid"; validation: Exclude<ValidateRangeResult, { ok: true }> }
  | { mode: "insufficient_funds"; required: number; current: number };

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
    // tokensCost est optionnel à la création (défaut 0 en DB)
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

      // 🟢 NOUVEAU : Permettre la mise à jour du coût
      tokensCost: number;
    }>,
  ): Promise<Scan>;

  finalize(
    userId: string,
    scanId: string,
    input: {
      finalStatus: "completed" | "canceled" | "failed";
      errorMessage?: string;
    },
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
    lastSuccessAt: string,
  ): Promise<void>;
}

export interface MailProviderApi {
  validateRange(
    startIso: string,
    endIso: string,
    rules: ScanRangeRules,
  ): Promise<ValidateRangeResult>;

  getAllMessageIdsInRange(input: {
    startIso: string;
    endIso: string;
    maxMessages: number; // ici on peut mettre 2000 (ou un cap par batch si tu veux)
  }): Promise<
    { ok: true; ids: string[] } | { ok: false; reason: "TOO_MANY_MESSAGES" }
  >;
}

interface PostgresError {
  code?: string;
  message?: string;
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
  private readonly sinceLastFallbackDays: number;

  //  CONFIG PRIX
  private readonly COST_PER_EMAIL = 1;

  constructor(
    private scans: ScanRepository,
    private checkpoints: MailCheckpointRepository,
    private providerApi: MailProviderApi,

    private mailReader: MailReaderApi,
    private mailAnalysis: MailAnalysisService,
    private jobIngestion: JobIngestionService,

    //  INJECTION DU REPO TRANSACTION
    private transactions: TransactionRepository,

    opts?: {
      rules?: ScanRangeRules; // default {90,2000}
      batchHours?: number; // default 8h
      sinceLastFallbackDays?: number; // default 7
    },
  ) {
    this.rules = opts?.rules ?? { maxDays: 90, maxMessages: 2000 };
    this.batchHours = opts?.batchHours ?? 24;
    this.sinceLastFallbackDays = opts?.sinceLastFallbackDays ?? 7;
  }

  /**
   * INIT (v5 - AVEC VERIFICATION DEVIS)
   */
  async init(
    userId: string,
    provider: MailProvider,
    input: InitInput,
  ): Promise<InitResult> {
    const active = await this.scans.findActiveScan(userId);
    if (active) return { mode: "existing", scan: active };

    const resolved = await this.resolveRange(userId, provider, input);
    if (!resolved.ok) {
      return { mode: "invalid", validation: resolved.validation };
    }

    const { startIso, endIso, totalCount } = resolved;

    // 1. LOGIQUE FINANCIÈRE : CHECK DU DEVIS
    if (totalCount > 0) {
      const estimatedCost = totalCount * this.COST_PER_EMAIL;
      const currentBalance = await this.transactions.getBalance(userId);

      if (currentBalance < estimatedCost) {
        return {
          mode: "insufficient_funds",
          required: estimatedCost,
          current: currentBalance,
        };
      }
    }

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
      // tokensCost sera à 0 par défaut en DB
    });

    return { mode: "new", scan: created };
  }

  /**
   * RUN BATCH (v5 - AVEC DÉBIT RÉEL)
   */

  async runBatch(userId: string, scanId: string): Promise<BatchResult> {
    const scan = await this.mustGetScan(userId, scanId);

    if (isFinal(scan.status)) {
      return { scan };
    }

    // 1. CHECK SOLDE GLOBAL
    const initialBalance = await this.transactions.getBalance(userId);

    // Sécurité : on s'assure que c'est bien un nombre
    if (typeof initialBalance !== "number" || isNaN(initialBalance)) {
      // En prod, on pourrait logger une erreur critique ici ou throw
      // Pour l'instant on laisse continuer, le paiement DB bloquera si besoin
    }

    if (initialBalance <= 0) {
      const paused = await this.scans.update(userId, scanId, {
        status: "paused",
        errorMessage: "INSUFFICIENT_FUNDS",
        shouldContinue: false,
      });
      return { scan: paused };
    }

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
        running.rangeEndAt,
      );
      return { scan: finalized };
    }

    // Fenêtre batch
    const windowStart = running.cursorAt;
    const windowEnd = minIso(
      addHoursIso(windowStart, this.batchHours),
      running.rangeEndAt,
    );

    try {
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
            running.rangeEndAt,
          );
          return { scan: finalized };
        }
        return { scan: updated };
      }

      let succeeded = 0;
      let localFailed = 0;
      let hasExternalFailure = false;
      let externalFailureMsg: string | null = null;
      let isOutOfFunds = false;

      // BOUCLE DE TRAITEMENT
      for (const id of ids) {
        // Pré-check JS (Limiteur de vitesse)
        const currentCost = (succeeded + 1) * this.COST_PER_EMAIL;

        if (currentCost > initialBalance) {
          isOutOfFunds = true;
          break;
        }

        try {
          const rawMail = await this.mailReader.getRawMailById(
            userId,
            running.provider,
            id,
          );
          const analysis = await this.mailAnalysis.analyzeMail(rawMail);
          await this.jobIngestion.ingestAnalyzedMail({
            userId,
            provider: running.provider,
            rawMail,
            analysis,
          });
          succeeded += 1;
        } catch (e: unknown) {
          const msg = this.stringifyError(e);
          if (isRetryableExternalFailure(msg)) {
            hasExternalFailure = true;
            externalFailureMsg = msg;
            break;
          }
          localFailed += 1;
        }
      }

      // 3. PAIEMENT SÉCURISÉ
      let batchCost = 0;
      let paymentFailed = false;

      if (succeeded > 0) {
        batchCost = succeeded * this.COST_PER_EMAIL;

        try {
          await this.transactions.createTransaction({
            userId,
            amount: -batchCost,
            type: "SCAN_USAGE",
            description: `Batch processing: ${succeeded} emails`,
            referenceId: scanId,
          });
        } catch (e: unknown) {
          // Type Guard pour éviter 'any'
          const pgError = e as PostgresError;

          // Vérification du code d'erreur Postgres (23514 = Check Constraint Violation)
          if (
            pgError?.code === "23514" ||
            (pgError.message &&
              pgError.message.includes("user_wallets_balance_check"))
          ) {
            paymentFailed = true;
          } else {
            throw e; // Autre erreur grave, on laisse remonter
          }
        }
      }

      // CAS A : Arrêt pour fonds (JS ou DB)
      if (isOutOfFunds || paymentFailed) {
        const currentCost = running.tokensCost || 0;
        const finalCostToAdd = paymentFailed ? 0 : batchCost;

        const paused = await this.scans.update(userId, scanId, {
          status: "paused",
          errorMessage: "INSUFFICIENT_FUNDS",
          shouldContinue: false,
          tokensCost: currentCost + finalCostToAdd,
        });
        return { scan: paused };
      }

      // CAS B : Erreur Externe
      if (hasExternalFailure) {
        const currentCost = running.tokensCost || 0;
        const paused = await this.scans.update(userId, scanId, {
          status: "paused",
          errorMessage: externalFailureMsg ?? "RETRYABLE_EXTERNAL_FAILURE",
          shouldContinue: true,
          tokensCost: currentCost + batchCost,
        });
        return { scan: paused };
      }

      // SUITE NORMALE
      const attempted = succeeded + localFailed;
      const newProcessed = Math.min(
        running.totalCount,
        Math.max(0, running.processedCount) + attempted,
      );
      const shouldContinue = new Date(windowEnd) < new Date(running.rangeEndAt);
      const currentCost = running.tokensCost || 0;
      const newTotalCost = currentCost + batchCost;

      const updated = await this.scans.update(userId, scanId, {
        cursorAt: windowEnd,
        processedCount: newProcessed,
        shouldContinue,
        errorMessage: localFailed > 0 ? `LOCAL_FAILED_${localFailed}` : null,
        tokensCost: newTotalCost,
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
          running.rangeEndAt,
        );
        return { scan: finalized };
      }

      return { scan: updated };
    } catch (e: unknown) {
      const msg = this.stringifyError(e);
      const paused = await this.scans.update(userId, scanId, {
        status: "paused",
        errorMessage: msg,
        shouldContinue: true,
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

    return { scan: canceled };
  }

  // ----------------- internals -----------------
  // (Le reste du fichier reste inchangé : resolveRange, mustGetScan, stringifyError, etc.)
  // Je te remets le reste pour que tu puisses copier-coller tout le fichier sans trou

  private async resolveRange(
    userId: string,
    provider: MailProvider,
    input: InitInput,
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
      this.rules,
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

function isRetryableExternalFailure(msg: string): boolean {
  const m = msg.toLowerCase();
  if (
    m.includes("openai") ||
    m.includes("rate limit") ||
    m.includes("quota") ||
    m.includes("timeout") ||
    m.includes("etimedout") ||
    m.includes("econnreset")
  )
    return true;
  if (
    m.includes("gmail") ||
    m.includes("outlook") ||
    m.includes("googleapis") ||
    m.includes("graph.microsoft") ||
    m.includes("429") ||
    m.includes("503")
  )
    return true;
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
