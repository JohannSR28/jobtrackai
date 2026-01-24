// app/api/applications/_lib/deleteApplicationService.ts

import { JobApplicationRepository } from "@/repositories/jobApplicationRepository";
import { JobIngestionService } from "@/services/jobDomain/JobIngestionService";

export type DeleteApplicationParams = {
  userId: string;
  applicationId: string;
};

export type DeleteApplicationResponse = {
  deleted: true;
  emailsDeleted: number;
};

export class DeleteApplicationService {
  constructor(
    private jobApps: JobApplicationRepository,
    private jobIngestion: JobIngestionService
  ) {}

  async execute(
    params: DeleteApplicationParams
  ): Promise<DeleteApplicationResponse> {
    const { userId, applicationId } = params;

    // 1. Vérifier que l'application existe
    const existing = await this.jobApps.findById({ userId, applicationId });

    if (!existing) {
      throw new Error("APPLICATION_NOT_FOUND");
    }

    // 2. Supprimer via JobIngestionService (supprime aussi les emails liés)
    const { deletedEmails } = await this.jobIngestion.deleteApplicationHard({
      userId,
      applicationId,
    });

    return {
      deleted: true,
      emailsDeleted: deletedEmails,
    };
  }
}
