// services/jobDomain/application/archiveApplicationService.ts

import type { JobApplication } from "@/services/jobDomain/types";
import { JobApplicationRepository } from "@/repositories/jobApplicationRepository";
import { JobIngestionService } from "@/services/jobDomain/JobIngestionService";

export type ArchiveApplicationParams = {
  userId: string;
  applicationId: string;
  archived: boolean;
};

export type ArchiveApplicationResponse = {
  application: JobApplication;
  emailsUpdated: number;
};

export class ArchiveApplicationService {
  constructor(
    private jobApps: JobApplicationRepository,
    private jobIngestion: JobIngestionService
  ) {}

  async execute(
    params: ArchiveApplicationParams
  ): Promise<ArchiveApplicationResponse> {
    const { userId, applicationId, archived } = params;

    // 1. Vérifier que l'application existe
    const existing = await this.jobApps.findById({ userId, applicationId });

    if (!existing) {
      throw new Error("APPLICATION_NOT_FOUND");
    }

    // 2. Archiver/désarchiver via JobIngestionService (cascade sur emails)
    const { updatedEmails } = await this.jobIngestion.setApplicationArchived({
      userId,
      applicationId,
      archived,
    });

    // 3. Récupérer l'application mise à jour
    const updated = await this.jobApps.findById({ userId, applicationId });

    if (!updated) {
      throw new Error("APPLICATION_ARCHIVE_FAILED");
    }

    return {
      application: updated,
      emailsUpdated: updatedEmails,
    };
  }
}
