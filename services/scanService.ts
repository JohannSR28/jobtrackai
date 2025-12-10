// src/services/ScanService.ts
import {
  MailConnectionsService,
  MailProvider,
} from "@/services/MailConnectionsService";
import { GmailClient } from "@/services/gmailClient";
import { AiService } from "./aiServices";
import {
  JobEmailsRepository,
  JobEmailInsert,
  JobEmailStatus,
} from "@/repositories/JobEmailsRepository";
import { JobApplicationsService } from "./JobApplicationsService";
import {
  ScanLogsRepository,
  ScanLog,
  ScanStatus as ScanLogStatus,
} from "@/repositories/ScanLogsRepository";

export type ScanStatus =
  | "idle"
  | "preparing"
  | "running"
  | "completing"
  | "done"
  | "error"
  | "completed";

export class ScanService {
  /**
   * Récupère les IDs des derniers e-mails d'un utilisateur.
   * Utilisé par /api/scan/prepare (ancienne version)
   */
  static async getRecentMessageIdsForUser(
    userId: string,
    provider: MailProvider,
    maxMessages: number
  ): Promise<string[]> {
    if (provider !== "gmail") {
      throw new Error("[ScanService] Seul Gmail est supporté pour le moment.");
    }

    const conn = new MailConnectionsService(userId, provider);
    const accessToken = await conn.getValidAccessToken();
    const gmail = new GmailClient(accessToken);

    const ids = await gmail.listMessages(maxMessages, "in:inbox");
    return ids;
  }

  /**
   * Préparation V2 : scan par période (start/end dates)
   *
   * - Réconcilie les anciens scans "running/pending"
   *   (y compris les crédits via token_count)
   * - Cherche le DERNIER scan (tous status confondus)
   * - Si trouvé :
   *    periodStartTs = lastScan.last_email_date ?? lastScan.period_end_ts
   * - Sinon :
   *    periodStartTs = début de la journée
   * - periodEndTs = maintenant
   * - Récupère les IDs Gmail dans cette plage
   * - Crée un scan_log "running" avec email_count = messageIds.length
   *   (insertInitial pré-débitera credits_spent = email_count, credit_settled = false)
   */
  static async prepareScanForUserV2(
    userId: string,
    provider: MailProvider,
    maxMessages: number = 200
  ): Promise<{
    scanLogId: string;
    messageIds: string[];
    periodStartTs: number;
    periodEndTs: number;
  }> {
    if (provider !== "gmail") {
      throw new Error("[ScanService] Seul Gmail est supporté pour le moment.");
    }

    // 0) Nettoyer les anciens scans "running/pending" + rectifier leurs crédits
    await ScanService.reconcileRunningScans(userId);

    const now = new Date();

    // 1) Chercher le dernier scan (tous status confondus)
    const lastScan: ScanLog | null = await ScanLogsRepository.findLastAny(
      userId
    );

    let periodStartTs: number;
    if (lastScan) {
      const base = lastScan.last_email_date ?? lastScan.period_end_ts ?? null;
      if (base) {
        periodStartTs = base;
      } else {
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        periodStartTs = startOfDay.getTime();
      }
    } else {
      /*
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      periodStartTs = startOfDay.getTime();
      */
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setDate(startOfDay.getDate() - 21); // Go back 21 days
      startOfDay.setHours(0, 0, 0, 0); // Set to start of that day
      periodStartTs = startOfDay.getTime();
    }

    const periodEndTs = now.getTime();

    // 2) Access token Gmail
    const conn = new MailConnectionsService(userId, provider);
    const accessToken = await conn.getValidAccessToken();
    const gmail = new GmailClient(accessToken);

    // 3) IDs dans cette plage
    const messageIds = await gmail.listMessagesByDateRange(
      periodStartTs,
      periodEndTs,
      maxMessages,
      "in:inbox"
    );

    // 4) Créer le log de scan
    //    -> insertInitial va :
    //       - pré-débit : credits_spent = email_count
    //       - credit_settled = false
    const scanLog = await ScanLogsRepository.insertInitial({
      user_id: userId,
      period_start_ts: periodStartTs,
      period_end_ts: periodEndTs,
      email_count: messageIds.length,
      status: "running",
    });

    return {
      scanLogId: scanLog.id,
      messageIds,
      periodStartTs,
      periodEndTs,
    };
  }

  /**
   * Traite un batch de messageIds.
   * - lit Gmail
   * - analyse via IA
   * - insère dans job_emails si pertinent (avec insertIgnoreDuplicate)
   * - met à jour scan_logs (processed_count, job_email_count, last_email_date, token_count)
   *
   * Utilisé par /api/scan/batch
   *
   * Nouvelle logique crédits :
   * - pendant le batch : on ne touche pas à credits_spent
   * - on incrémente seulement token_count (source de vérité)
   * - si à la fin du batch le scan est "completed" :
   *     - finalCredits = ceil(token_count / 1000)
   *     - credits_spent = finalCredits
   *     - credit_settled = true
   */
  static async scanBatchForUser(options: {
    userId: string;
    provider: MailProvider;
    messageIds: string[];
    scanLogId?: string | null;
  }): Promise<{
    processed: number;
    saved: number;
    details: Array<{
      messageId: string;
      status: JobEmailStatus | null;
      saved: boolean;
    }>;
  }> {
    const { userId, provider, messageIds, scanLogId } = options;

    if (provider !== "gmail") {
      throw new Error("[ScanService] Seul Gmail est supporté pour le moment.");
    }

    // 0) Récupérer le scan_log à mettre à jour (si existant)
    let scanLog: ScanLog | null = null;

    if (scanLogId) {
      const found = await ScanLogsRepository.findById(scanLogId);
      if (found && found.user_id === userId && found.status === "running") {
        scanLog = found;
      }
    }

    if (!scanLog) {
      scanLog = await ScanLogsRepository.findRunningByUser(userId);
    }

    // 1) Token Gmail
    const conn = new MailConnectionsService(userId, provider);
    const accessToken = await conn.getValidAccessToken();
    const gmail = new GmailClient(accessToken);

    let processed = 0;
    let saved = 0;
    let lastEmailDateInBatch: number | null = null;

    // Tokens utilisés sur ce batch (source de vérité pour le coût)
    let batchTokenCount = 0;

    const details: Array<{
      messageId: string;
      status: JobEmailStatus | null;
      saved: boolean;
    }> = [];

    for (const messageId of messageIds) {
      processed++;

      try {
        const mail = await gmail.getMessage(messageId);

        if (
          mail.dateTs &&
          (!lastEmailDateInBatch || mail.dateTs > lastEmailDateInBatch)
        ) {
          lastEmailDateInBatch = mail.dateTs;
        }

        const { analysis, meta } = await AiService.analyzeMail(mail);

        // compter les tokens utilisés par ce mail
        const tokensForMail = meta.tokenUsage.total_tokens ?? 0;
        batchTokenCount += tokensForMail;

        // Pas de calcul de crédits par mail ici :
        // -> on attend la fin du scan pour recalculer credits_spent sur le total des tokens.

        if (!analysis.isJobEmail) {
          details.push({
            messageId,
            status: null,
            saved: false,
          });
          continue;
        }

        const applicationId = await JobApplicationsService.upsertForMail({
          userId,
          mail: {
            dateTs: mail.dateTs ?? null,
            threadId: mail.threadId,
          },
          analysis: {
            isJobEmail: analysis.isJobEmail,
            status: analysis.status,
            company: analysis.company,
            role: analysis.role,
          },
          messageId,
        });

        const toInsert: JobEmailInsert = {
          user_id: userId,
          provider,
          message_id: messageId,
          status: analysis.status,
          company: analysis.company,
          role: analysis.role,
          email_date_ts: mail.dateTs ?? null,
          application_id: applicationId,
        };

        const inserted = await JobEmailsRepository.insertIgnoreDuplicate(
          toInsert
        );

        if (inserted) {
          saved++;
        }

        details.push({
          messageId,
          status: analysis.status,
          saved: Boolean(inserted),
        });
      } catch (err) {
        console.error("[ScanService] Erreur scanBatchForUser:", err);

        details.push({
          messageId,
          status: null,
          saved: false,
        });
      }
    }

    // 2) Mise à jour du scan_log (si on en a un)
    if (scanLog) {
      const nowMs = Date.now();

      const previousProcessed = scanLog.processed_count ?? 0;
      const previousJobEmails = scanLog.job_email_count ?? 0;

      const processedAfter = previousProcessed + processed;
      const jobEmailsAfter = previousJobEmails + saved;

      const total = scanLog.email_count ?? 0;

      const previousTokens = scanLog.token_count ?? 0;
      const tokensAfter = previousTokens + batchTokenCount;

      const startedAt = scanLog.started_at ?? nowMs;
      const durationMs =
        scanLog.scan_duration_ms && scanLog.scan_duration_ms > 0
          ? scanLog.scan_duration_ms
          : Math.max(0, nowMs - startedAt);

      let newStatus: ScanLogStatus = "running";

      if (total > 0 && processedAfter >= total) {
        newStatus = "completed";
      }

      const updates: Parameters<typeof ScanLogsRepository.update>[1] = {
        processed_count: processedAfter,
        job_email_count: jobEmailsAfter,
        last_email_date: lastEmailDateInBatch ?? scanLog.last_email_date,
        last_update_at: nowMs,
        status: newStatus,
        scan_duration_ms:
          newStatus === "completed" ? durationMs : scanLog.scan_duration_ms,
        token_count: tokensAfter,
        // on NE TOUCHE PAS à credits_spent tant que ce n'est pas "completed"
      };

      // Si le scan est terminé avec ce batch, on recalcule les crédits
      // à partir du total de tokens.
      if (newStatus === "completed") {
        const finalCredits = Math.ceil(tokensAfter / 1000);

        updates.credits_spent = finalCredits;
        updates.credit_settled = true;
      }

      await ScanLogsRepository.update(scanLog.id, updates);
    }

    return {
      processed,
      saved,
      details,
    };
  }

  /**
   * Réconcilie les scans "running/pending" pour un user :
   * - si processed_count >= email_count → completed
   * - si total === 0 et treated === 0 → empty
   * - sinon → interrupted
   *
   * Et à la fin, dans tous les cas, on rectifie aussi les crédits
   * à partir de token_count :
   *   finalCredits = ceil(token_count / 1000)
   *   credits_spent = finalCredits
   *   credit_settled = true
   *
   * -> permet de corriger les scans "bloqués" si l'utilisateur refresh,
   *    au prochain prepareScanForUserV2.
   */
  private static async reconcileRunningScans(userId: string): Promise<void> {
    const runningScans = await ScanLogsRepository.findAllRunningByUser(userId);
    if (runningScans.length === 0) return;

    const nowMs = Date.now();

    for (const log of runningScans) {
      const startedAt = log.started_at ?? nowMs;
      const durationMs =
        log.scan_duration_ms && log.scan_duration_ms > 0
          ? log.scan_duration_ms
          : Math.max(0, nowMs - startedAt);

      const treated = log.processed_count ?? 0;
      const total = log.email_count ?? 0;

      // Calcul des crédits finaux depuis les tokens réellement consommés
      const totalTokens = log.token_count ?? 0;
      const finalCredits = Math.ceil(totalTokens / 1000);

      if (total > 0 && treated >= total) {
        // En réalité, ce scan est terminé
        await ScanLogsRepository.update(log.id, {
          status: "completed",
          scan_duration_ms: durationMs,
          last_update_at: nowMs,
          credits_spent: finalCredits,
          credit_settled: true,
        });
      } else if (total === 0 && treated === 0) {
        // Scan "vide"
        await ScanLogsRepository.update(log.id, {
          status: "empty",
          scan_duration_ms: durationMs,
          last_update_at: nowMs,
          credits_spent: finalCredits,
          credit_settled: true,
        });
      } else {
        // Scan interrompu : on facture uniquement selon les tokens réellement consommés
        await ScanLogsRepository.update(log.id, {
          status: "interrupted",
          scan_duration_ms: durationMs,
          last_update_at: nowMs,
          credits_spent: finalCredits,
          credit_settled: true,
        });
      }
    }
  }
}
