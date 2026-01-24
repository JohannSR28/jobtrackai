//  services/jobDomain/application/updateApplicationService.ts

import type { JobApplication, JobStatus } from "@/services/jobDomain/types";
import { JobApplicationRepository } from "@/repositories/jobApplicationRepository";

export type UpdateApplicationParams = {
  userId: string;
  applicationId: string;
  company?: string | null;
  position?: string | null;
  status?: JobStatus;
  notes?: string | null;
};

export class UpdateApplicationService {
  constructor(private jobApps: JobApplicationRepository) {}

  async execute(params: UpdateApplicationParams): Promise<JobApplication> {
    const { userId, applicationId, ...updates } = params;

    // 1. Vérifier que l'application existe
    const existing = await this.jobApps.findById({ userId, applicationId });

    if (!existing) {
      throw new Error("APPLICATION_NOT_FOUND");
    }

    // 2. Construire les champs à mettre à jour
    const updateData = {
      company:
        updates.company !== undefined ? updates.company : existing.company,
      position:
        updates.position !== undefined ? updates.position : existing.position,
      status: updates.status ?? existing.status,
      notes: updates.notes !== undefined ? updates.notes : existing.notes,
    };

    // 3. Appeler la méthode existante du repository
    await this.jobApps.updateFields({
      userId,
      applicationId,
      company: updateData.company,
      position: updateData.position,
      status: updateData.status,
      notes: updateData.notes,
    });

    // 4. Récupérer l'application mise à jour
    const updated = await this.jobApps.findById({ userId, applicationId });

    if (!updated) {
      throw new Error("APPLICATION_UPDATE_FAILED");
    }

    return updated;
  }
}
