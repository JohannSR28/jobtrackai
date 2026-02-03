// services/jobDomain/application/getApplicationService.ts

import type {
  JobApplication,
  JobEmail,
  JobStatus,
} from "@/services/jobDomain/types";
import { JobApplicationRepository } from "@/repositories/jobApplicationRepository";
import { JobEmailRepository } from "@/repositories/jobEmailRepository";

export type Bucket = {
  app: JobApplication;
  emails: JobEmail[];
};

export type GetApplicationsParams = {
  userId: string;
  archived?: boolean;
  status?: JobStatus | "all";
  search?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type GetApplicationsResponse = {
  applications: Bucket[];
  total: number;
  page: number;
  maxPage: number;
  statusCounts: Record<JobStatus | "all", number>;
};

export class GetApplicationsService {
  constructor(
    private jobApps: JobApplicationRepository,
    private jobEmails: JobEmailRepository,
  ) {}

  async execute(
    params: GetApplicationsParams,
  ): Promise<GetApplicationsResponse> {
    const {
      userId,
      archived = false,
      status = "all",
      search = "",
      sortOrder = "desc",
      page = 1,
      pageSize = 20,
    } = params;

    // 1. Récupérer toutes les applications avec recherche et tri
    const applications = await this.jobApps.findMany({
      userId,
      archived,
      status,
      search, // <--- Passage au repo
      orderBy: "last_activity_at",
      orderDir: sortOrder, // <--- Passage au repo
    });

    // 2. Récupérer les emails liés
    const applicationIds = applications.map((app) => app.id);
    const emails = await this.jobEmails.findManyByApplicationIds({
      userId,
      applicationIds,
      archived,
    });

    // 3. Récupérer les emails non assignés
    const unassignedEmails = await this.jobEmails.findUnassigned({
      userId,
      archived,
    });

    // 4. Grouper les emails par application_id
    const emailsByAppId: Record<string, JobEmail[]> = {};
    for (const email of emails) {
      const appId = email.applicationId ?? "__unassigned__";
      if (!emailsByAppId[appId]) {
        emailsByAppId[appId] = [];
      }
      emailsByAppId[appId].push(email);
    }

    // 5. Créer les buckets
    const buckets: Bucket[] = applications.map((app) => ({
      app,
      emails: emailsByAppId[app.id] ?? [],
    }));

    // 6. Compter par statut
    const statusCounts = await this.jobApps.countByStatus({
      userId,
      archived,
    });

    // 7. Pagination (exclure __unassigned__ du total)
    const total = buckets.length;
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.max(1, Math.min(page, maxPage));
    const start = (safePage - 1) * pageSize;
    const pagedBuckets = buckets.slice(start, start + pageSize);

    // 8. Ajouter __unassigned__ au début si présent
    let finalBuckets = pagedBuckets;

    if (unassignedEmails.length > 0 && safePage === 1) {
      const unassignedBucket: Bucket = {
        app: {
          id: "__unassigned__",
          userId,
          company: "Unassigned",
          position: "Emails not linked to an application",
          status: "unknown",
          appliedAt: null,
          lastActivityAt: new Date().toISOString(),
          notes: "Bucket auto (frontend).",
          archived: false,
          createdBy: "auto",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        emails: unassignedEmails,
      };
      finalBuckets = [unassignedBucket, ...pagedBuckets];
    }

    return {
      applications: finalBuckets,
      total,
      page: safePage,
      maxPage,
      statusCounts,
    };
  }
}
