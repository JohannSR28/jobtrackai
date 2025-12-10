// src/services/JobApplicationsService.ts
import {
  JobApplicationsRepository,
  type JobApplication,
} from "@/repositories/JobApplicationsRepository";
import type { JobEmailStatus } from "@/repositories/JobEmailsRepository";

interface MailLike {
  dateTs: number | null;
  threadId?: string | null;
}

interface MailAnalysis {
  isJobEmail: boolean;
  status: JobEmailStatus;
  company: string | null;
  role: string | null;
}

/**
 * Service responsable de la logique métier autour des candidatures
 * (job_applications).
 */
export class JobApplicationsService {
  /**
   * Trouve ou crée une candidature pour un mail donné, et met à jour son statut
   * si ce mail est plus récent que le dernier connu.
   *
   * Retourne l'id de la JobApplication, ou null si on ne peut pas
   * raisonnablement rattacher ce mail à une candidature.
   */
  static async upsertForMail(options: {
    userId: string;
    mail: MailLike;
    analysis: MailAnalysis;
    messageId: string;
  }): Promise<string | null> {
    const { userId, mail, analysis, messageId } = options;

    if (!analysis.isJobEmail) {
      return null;
    }

    const threadHint =
      typeof mail.threadId === "string" && mail.threadId.trim().length > 0
        ? mail.threadId.trim()
        : null;

    const companyGuess =
      analysis.company && analysis.company.trim().length > 0
        ? analysis.company.trim()
        : null;

    const roleGuess =
      analysis.role && analysis.role.trim().length > 0
        ? analysis.role.trim()
        : null;

    // Si on n'a ni threadHint, ni (company+role), on considère que le mail
    // est trop ambigu pour créer automatiquement une candidature.
    if (!threadHint && (!companyGuess || !roleGuess)) {
      return null;
    }

    // 1) Essayer de trouver une application existante
    let application: JobApplication | null = null;

    if (threadHint) {
      application = await JobApplicationsRepository.findByThreadHint(
        userId,
        threadHint
      );
    }

    if (!application && companyGuess && roleGuess) {
      application = await JobApplicationsRepository.findByCompanyAndRole(
        userId,
        companyGuess,
        roleGuess
      );
    }

    const emailDateTs = mail.dateTs ?? Date.now();

    // 2) Si aucune candidature trouvée, en créer une nouvelle
    if (!application) {
      const created = await JobApplicationsRepository.insertInitial({
        user_id: userId,
        company: companyGuess,
        role: roleGuess,
        current_status: analysis.status,
        last_email_message_id: messageId,
        last_email_date_ts: emailDateTs,
        thread_hint: threadHint ?? null,
      });

      return created.id;
    }

    // 3) Si une candidature existe déjà, décider si on la met à jour
    const currentLastDate = application.last_email_date_ts ?? 0;

    // Si le mail est plus récent (ou égal), on met à jour le snapshot
    if (emailDateTs >= currentLastDate) {
      const updated = await JobApplicationsRepository.update(application.id, {
        current_status: analysis.status,
        last_email_message_id: messageId,
        last_email_date_ts: emailDateTs,
        // Au cas où thread_hint était null et qu'on ait un thread maintenant
        thread_hint: application.thread_hint ?? threadHint ?? null,
      });

      return updated.id;
    }

    // Le mail est plus ancien que le dernier événement connu pour cette candidature
    // -> on ne modifie pas l'état courant.
    return application.id;
  }
}
