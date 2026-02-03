import type { RawMail, MailAnalysisResult } from "@/services/ai/mailAnalysis";
import type { JobStatus } from "../jobDomain/types";
import { JobEmailRepository } from "@/repositories/jobEmailRepository";
import { JobApplicationRepository } from "@/repositories/jobApplicationRepository";

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normalizeText(s: string | null): string | null {
  if (!s) return null;
  const t = s.trim();
  return t.length ? t : null;
}

function normalizeStatus(s: JobStatus): JobStatus {
  return s; // strict côté IA + enum DB
}

const STATUS_RANK: Record<JobStatus, number> = {
  unknown: 0,
  applied: 10, // Niveau de base
  interview: 20, // Progression
  rejection: 30, // État Final (Haute priorité)
  offer: 30, //  État Final (Haute priorité)
};

function computeApplicationStatus(statuses: JobStatus[]): JobStatus {
  if (statuses.length === 0) return "unknown";
  let best: JobStatus = "unknown";

  for (const s of statuses) {
    if (STATUS_RANK[s] >= STATUS_RANK[best]) {
      best = s;
    }
  }
  return best;
}

export class JobIngestionService {
  constructor(
    private jobEmails: JobEmailRepository,
    private jobApps: JobApplicationRepository,
  ) {}

  async ingestAnalyzedMail(input: {
    userId: string;
    provider: "gmail" | "outlook";
    rawMail: RawMail;
    analysis: MailAnalysisResult;
  }): Promise<
    | { stored: false }
    | { stored: true; jobEmailId: string; applicationId: string }
  > {
    const { userId, provider, rawMail, analysis } = input;

    if (!analysis.isJobRelated) return { stored: false };

    const company = normalizeText(analysis.company);
    const position = normalizeText(analysis.position);

    const status = normalizeStatus(analysis.status);
    const eventType = normalizeText(analysis.eventType);
    const confidence = clamp01(analysis.confidence);

    // 1) upsert job_email
    const jobEmail = await this.jobEmails.upsertByProviderMessage({
      userId,
      provider,
      providerMessageId: rawMail.id,
      receivedAt: rawMail.date,
      fromText: rawMail.from,
      subject: rawMail.subject,
      snippet: rawMail.snippet,
      company,
      position,
      status,
      eventType,
      confidence,
    });

    // IMPORTANT: Respect manual moves (do not overwrite application_id)
    if (jobEmail.applicationId) {
      // Optional: keep the existing app summary coherent after an email update
      await this.recomputeApplicationSummary({
        userId,
        applicationId: jobEmail.applicationId,
      });

      return {
        stored: true,
        jobEmailId: jobEmail.id,
        applicationId: jobEmail.applicationId,
      };
    }

    // 2) find or create application (auto grouping)
    let app = await this.jobApps.findCandidateByCompanyPosition({
      userId,
      company,
      position,
    });

    if (!app) {
      app = await this.jobApps.create({
        userId,
        company,
        position,
        createdBy: "auto",
      });
    }

    // 3) attach email (only if not already attached)
    await this.jobEmails.attachToApplication({
      userId,
      jobEmailId: jobEmail.id,
      applicationId: app.id,
    });

    // 4) recompute app summary
    await this.recomputeApplicationSummary({ userId, applicationId: app.id });

    return { stored: true, jobEmailId: jobEmail.id, applicationId: app.id };
  }

  async recomputeApplicationSummary(input: {
    userId: string;
    applicationId: string;
  }): Promise<void> {
    const emails = await this.jobEmails.listByApplication({
      userId: input.userId,
      applicationId: input.applicationId,
    });

    if (emails.length === 0) {
      const nowIso = new Date().toISOString();

      // Option MVP: don't blank company/position (prevents "Unassigned" clone)
      // If you don't want to change JobApplicationRepository, skip updating company/position here.
      await this.jobApps.updateSummary({
        userId: input.userId,
        applicationId: input.applicationId,
        company: null,
        position: null,
        status: "unknown",
        appliedAt: null,
        lastActivityAt: nowIso,
      });
      return;
    }

    const company = emails.find((e) => e.company)?.company ?? null;
    const position = emails.find((e) => e.position)?.position ?? null;

    const status = computeApplicationStatus(emails.map((e) => e.status));

    const applied = emails.find((e) => e.status === "applied");
    const appliedAt = applied ? applied.receivedAt : null;

    const lastActivityAt = emails.reduce(
      (maxIso, e) => (e.receivedAt > maxIso ? e.receivedAt : maxIso),
      emails[0]!.receivedAt,
    );

    await this.jobApps.updateSummary({
      userId: input.userId,
      applicationId: input.applicationId,
      company,
      position,
      status,
      appliedAt,
      lastActivityAt,
    });
  }

  async deleteApplicationHard(input: {
    userId: string;
    applicationId: string;
  }): Promise<{
    deletedEmails: number;
  }> {
    // 1) delete all emails attached to the app (hard delete)
    const deletedEmails = await this.jobEmails.deleteHardByApplicationId({
      userId: input.userId,
      applicationId: input.applicationId,
    });

    // 2) delete application (hard delete)
    await this.jobApps.deleteHardById({
      userId: input.userId,
      applicationId: input.applicationId,
    });

    return { deletedEmails };
  }

  async setApplicationArchived(input: {
    userId: string;
    applicationId: string;
    archived: boolean;
  }): Promise<{ updatedEmails: number }> {
    // 1) update application
    await this.jobApps.setArchived({
      userId: input.userId,
      applicationId: input.applicationId,
      archived: input.archived,
    });

    // 2) cascade archive emails (manual)
    const updatedEmails = await this.jobEmails.setArchivedByApplicationId({
      userId: input.userId,
      applicationId: input.applicationId,
      archived: input.archived,
    });

    return { updatedEmails };
  }
}
