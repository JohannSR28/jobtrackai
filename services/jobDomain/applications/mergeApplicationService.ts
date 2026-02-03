import { JobApplicationRepository } from "@/repositories/jobApplicationRepository";
import { JobEmailRepository } from "@/repositories/jobEmailRepository";
import { JobStatus } from "@/services/jobDomain/types";

type MergeRequest = {
  userId: string;
  targetAppId: string;
  sourceAppId: string;
  finalData: {
    company: string | null;
    position: string | null;
    status: JobStatus;
    notes: string | null;
  };
};

export class MergeApplicationService {
  constructor(
    private jobApps: JobApplicationRepository,
    private jobEmails: JobEmailRepository,
  ) {}

  async execute(req: MergeRequest): Promise<void> {
    const { userId, targetAppId, sourceAppId, finalData } = req;

    // Sécurité de base : On ne fusionne pas une app avec elle-même
    if (targetAppId === sourceAppId) {
      throw new Error("CANNOT_MERGE_SAME_APPLICATION");
    }

    // 1. Déplacer les emails de la Source vers la Target
    await this.jobEmails.moveEmailsToApplication({
      userId,
      sourceAppId,
      targetAppId,
    });

    // 2. Mettre à jour la Target avec les données finales choisies par l'utilisateur
    // (On utilise updateFields que tu as déjà dans JobApplicationRepository)
    await this.jobApps.updateFields({
      userId,
      applicationId: targetAppId,
      company: finalData.company,
      position: finalData.position,
      status: finalData.status,
      notes: finalData.notes,
    });

    // 3. Supprimer l'application Source (Hard Delete)
    // (On utilise deleteHardById que tu as déjà)
    await this.jobApps.deleteHardById({
      userId,
      applicationId: sourceAppId,
    });
  }
}
