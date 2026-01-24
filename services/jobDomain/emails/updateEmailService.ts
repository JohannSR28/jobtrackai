// app/api/emails/_lib/updateEmailService.ts

import type {
  JobEmail,
  JobStatus,
  JobApplication,
} from "@/services/jobDomain/types";
import { JobEmailRepository } from "@/repositories/jobEmailRepository";
import { JobIngestionService } from "@/services/jobDomain/JobIngestionService";

export type UpdateEmailParams = {
  userId: string;
  jobEmailId: string;
  company?: string | null;
  position?: string | null;
  status?: JobStatus;
  eventType?: string | null;
};

export type UpdateEmailResponse = {
  email: JobEmail;
  applicationUpdated?: JobApplication;
};

export class UpdateEmailService {
  constructor(
    private jobEmails: JobEmailRepository,
    private jobIngestion: JobIngestionService
  ) {}

  async execute(params: UpdateEmailParams): Promise<UpdateEmailResponse> {
    const { userId, jobEmailId, ...updates } = params;

    // 1. Vérifier que l'email existe
    const existing = await this.jobEmails.findById({ userId, jobEmailId });

    if (!existing) {
      throw new Error("EMAIL_NOT_FOUND");
    }

    // 2. Construire les champs à mettre à jour
    const updateData = {
      company:
        updates.company !== undefined ? updates.company : existing.company,
      position:
        updates.position !== undefined ? updates.position : existing.position,
      status: updates.status ?? existing.status,
      eventType:
        updates.eventType !== undefined
          ? updates.eventType
          : existing.eventType,
    };

    // 3. Mettre à jour l'email
    await this.jobEmails.updateEmailFields({
      userId,
      jobEmailId,
      company: updateData.company,
      position: updateData.position,
      status: updateData.status,
      eventType: updateData.eventType,
    });

    // 4. Récupérer l'email mis à jour
    const updatedEmail = await this.jobEmails.findById({ userId, jobEmailId });

    if (!updatedEmail) {
      throw new Error("EMAIL_UPDATE_FAILED");
    }

    // 5. Si l'email est lié à une application, recalculer son résumé
    let updatedApplication: JobApplication | undefined;

    if (updatedEmail.applicationId) {
      await this.jobIngestion.recomputeApplicationSummary({
        userId,
        applicationId: updatedEmail.applicationId,
      });

      // Optionnel : récupérer l'application mise à jour pour la retourner
      // (nécessite d'injecter JobApplicationRepository dans le service)
      // updatedApplication = await jobApps.findById({ userId, applicationId: updatedEmail.applicationId });
    }

    return {
      email: updatedEmail,
      applicationUpdated: updatedApplication,
    };
  }
}
