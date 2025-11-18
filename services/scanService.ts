// src/services/ScanService.ts
import { AiService } from "@/services/mail-traitement-services/aiServices";
import { CreditService } from "@/services/creditServices";
import { ScanLogsRepository, ScanLog } from "@/repositories/ScanLogsRepository";
import { getAuthenticatedGmailService } from "@/utils/getAuthenticatedGmailService";
import { GmailClient } from "./gmailApiService";

export type BatchSuccess = {
  success: true;
  status: "running" | "completed";
  processedThisBatch: number;
  remaining: boolean;
};

export type BatchError = {
  success: false;
  reason: string;
};

export type BatchScanResult = BatchSuccess | BatchError;

interface BatchContext {
  userId: string;
  scanId: string;
  log: ScanLog;
  gmail: GmailClient;
}

interface BatchResult {
  processed: number;
  jobCount: number;
  tokensUsed: number;
  lastEmailDate: number | null;
}

interface CreditDelta {
  newTokenTotal: number;
  deltaCredits: number;
}

export class ScanService {
  static readonly TOKEN_UNIT = 1000;
  static readonly BATCH_SIZE = 20;

  /**
   * 1️ InitScan — crée un log 'pending' prêt à exécuter
   */
  static async initScan(userId: string) {
    // Vérifie s’il y a déjà un scan actif
    const running = await ScanLogsRepository.findRunningByUser(userId);
    if (running) throw new Error("Un scan est déjà en cours.");

    // Détermine la période à scanner
    const last = await ScanLogsRepository.findLastCompleted(userId);
    const end = Date.now();

    const start = last?.last_email_date
      ? last.last_email_date
      : end - 2 * 24 * 60 * 60 * 1000;

    // Récupère les mails Gmail
    const { gmail } = await getAuthenticatedGmailService();
    const mailIds = await gmail.listEmailIdsByDateRange(start, end);

    if (mailIds.length === 0) return { success: false, reason: "NO_MAILS" };

    // Estimation des crédits
    const estimatedTokens = mailIds.length * 1000;
    const estimatedCredits = Math.ceil(estimatedTokens / this.TOKEN_UNIT);
    const balance = await CreditService.getBalance(userId);
    if (balance < estimatedCredits)
      return { success: false, reason: "INSUFFICIENT_CREDITS" };

    // Création du log
    const scanId = crypto.randomUUID();
    await ScanLogsRepository.insert({
      id: scanId,
      user_id: userId,
      period_start_ts: start,
      period_end_ts: end,
      mail_ids: mailIds,
      email_count: mailIds.length,
      processed_count: 0,
      job_email_count: 0,
      token_count: 0,
      credits_spent: 0,
      status: "pending",
      started_at: null,
      last_update_at: Date.now(),
      stop_requested: false,
      last_email_date: null,
      scan_duration_ms: 0,
    });

    return {
      success: true,
      scanId,
      mailCount: mailIds.length,
      estimatedCredits,
    };
  }

  /**
   * 2️ BatchScan — traite un lot court (20 mails) puis s’arrête.
   *    - Calcule le curseur
   *    - Traite N mails
   *    - Update + débit
   *    - S'arrête proprement
   */
  static async batchScan(userId: string) {
    const log = await ScanLogsRepository.findRunningByUser(userId);

    if (!log) return { success: false, reason: "NO_ACTIVE_SCAN" };

    const scanId = log.id;

    if (["completed", "empty", "interrupted", "error"].includes(log.status))
      return { success: false, reason: "ALREADY_FINISHED" };

    // 1️ Préparation
    // Calcule le batch à traiter
    const { gmail, ids } = await this._prepareBatch(log, scanId);

    // 2️ Traitement du batch
    const batch: BatchResult = await this._processBatch({
      userId,
      scanId,
      log,
      gmail,
      ids,
    });

    // 3️ Calcul et débit des crédits
    const credit: CreditDelta = await this._computeCreditDelta({
      userId,
      scanId,
      log,
      tokensUsed: batch.tokensUsed,
    });

    // 4️ Finalisation
    const result = await this._finalizeBatch({
      userId,
      scanId,
      log,
      batch,
      credit,
    });

    return result;
  }

  static async stopScan(userId: string) {
    const scan = await ScanLogsRepository.findRunningByUser(userId);

    if (!scan) return { success: false, reason: "NO_ACTIVE_SCAN" };

    const scanId = scan.id;
    if (!scan || scan.user_id !== userId)
      throw new Error("Scan introuvable ou non autorisé.");

    if (["completed", "empty", "error", "interrupted"].includes(scan.status))
      return { success: false, reason: "ALREADY_STOPPED_OR_DONE" };

    await ScanLogsRepository.update(scanId, {
      stop_requested: true,
      status: "interrupted",
      last_update_at: Date.now(),
      last_email_date: scan.last_email_date ?? Date.now(),
    });

    return { success: true, status: "interrupted" };
  }

  static async getStatus(userId: string) {
    let scan = await ScanLogsRepository.findRunningByUser(userId);

    if (!scan) {
      scan = await ScanLogsRepository.findLastCompleted(userId);
    }

    if (!scan) return { success: false, reason: "NO_SCAN_FOUND" };

    const progress =
      scan.email_count > 0
        ? Math.min(
            100,
            Math.round((scan.processed_count / scan.email_count) * 100)
          )
        : 0;

    return {
      success: true,
      status: scan.status,
      progress,
      processed: scan.processed_count,
      total: scan.email_count,
      jobEmails: scan.job_email_count,
      creditsSpent: scan.credits_spent,
      stopRequested: scan.stop_requested,
      lastUpdate: scan.last_update_at,
    };
  }
  private static async _prepareBatch(log: ScanLog, scanId: string) {
    if (log.status === "pending") {
      await ScanLogsRepository.update(scanId, {
        status: "running",
        started_at: Date.now(),
      });
    }

    const start = log.processed_count;
    const end = Math.min(start + this.BATCH_SIZE, log.email_count);
    const ids = log.mail_ids.slice(start, end);

    if (ids.length === 0)
      throw Object.assign(new Error("Batch vide"), {
        code: "BATCH_EMPTY",
      });

    const { gmail } = await getAuthenticatedGmailService();
    return { gmail, ids, start, end };
  }

  private static async _processBatch(
    ctx: BatchContext & { ids: string[] }
  ): Promise<BatchResult> {
    let processed = 0;
    let jobCount = 0;
    let tokensUsed = 0;
    let lastEmailDate = ctx.log.last_email_date ?? null;

    for (const id of ctx.ids) {
      try {
        const mail = await ctx.gmail.fetchMessageById(id);
        const result = await AiService.analyzeMail(mail);

        processed++;
        if (result.is_job_email) jobCount++;
        tokensUsed += result.token_usage?.total_tokens ?? 0;
        lastEmailDate = mail.dateTs ?? lastEmailDate ?? Date.now();
      } catch (err) {
        console.warn(`[BatchScan] Skip failed mail ${id}:`, err);
      }
    }

    return { processed, jobCount, tokensUsed, lastEmailDate };
  }

  private static async _computeCreditDelta({
    userId,
    scanId,
    log,
    tokensUsed,
  }: {
    userId: string;
    scanId: string;
    log: ScanLog;
    tokensUsed: number;
  }): Promise<CreditDelta> {
    const newTokenTotal = log.token_count + tokensUsed;
    const prevCredits = Math.floor(log.token_count / this.TOKEN_UNIT);
    const newCredits = Math.floor(newTokenTotal / this.TOKEN_UNIT);
    const deltaCredits = Math.max(0, newCredits - prevCredits);

    if (deltaCredits > 0) {
      await CreditService.debitProgressive({
        userId,
        scanId,
        delta: deltaCredits,
      });
    }

    return { newTokenTotal, deltaCredits };
  }
  private static async _finalizeBatch({
    userId,
    scanId,
    log,
    batch,
    credit,
  }: {
    userId: string;
    scanId: string;
    log: ScanLog;
    batch: BatchResult;
    credit: CreditDelta;
  }) {
    const newProcessed = log.processed_count + batch.processed;
    const isDone = newProcessed >= log.email_count;

    let finalCredits = log.credits_spent + credit.deltaCredits;
    let finalStatus: ScanLog["status"] = "running";

    // Si terminé, on solde les crédits restants
    if (isDone) {
      const expectedCredits = Math.ceil(credit.newTokenTotal / this.TOKEN_UNIT);
      const remainingDelta = expectedCredits - finalCredits;

      if (remainingDelta > 0) {
        await CreditService.debitProgressive({
          userId,
          scanId,
          delta: remainingDelta,
        });
        finalCredits += remainingDelta;
      }

      finalStatus = "completed";
    }

    await ScanLogsRepository.update(scanId, {
      processed_count: newProcessed,
      job_email_count: log.job_email_count + batch.jobCount,
      token_count: credit.newTokenTotal,
      credits_spent: finalCredits,
      status: finalStatus,
      last_email_date: batch.lastEmailDate,
      last_update_at: Date.now(),
    });

    return {
      success: true,
      status: finalStatus,
      processedThisBatch: batch.processed,
      remaining: !isDone,
    };
  }
}
