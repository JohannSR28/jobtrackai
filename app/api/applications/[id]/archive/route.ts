// app/api/applications/[id]/archive/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { JobApplicationRepository } from "@/repositories/jobApplicationRepository";
import { JobEmailRepository } from "@/repositories/jobEmailRepository";
import { JobIngestionService } from "@/services/jobDomain/JobIngestionService";
import { ArchiveApplicationService } from "@/services/jobDomain/applications/archiveApplicationService";

/**
 * PATCH /api/applications/:id/archive
 *
 * Body:
 * {
 *   archived: boolean
 * }
 *
 * Response:
 * {
 *   application: JobApplication,
 *   emailsUpdated: number
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Auth
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse body
    const body = await request.json();
    const { archived } = body;

    // 3. Validate
    if (typeof archived !== "boolean") {
      return NextResponse.json(
        { error: 'Invalid body: "archived" must be a boolean' },
        { status: 400 }
      );
    }

    // 4. Instantiate repositories + services
    const jobApps = new JobApplicationRepository(supabase);
    const jobEmails = new JobEmailRepository(supabase);
    const jobIngestion = new JobIngestionService(jobEmails, jobApps);
    const service = new ArchiveApplicationService(jobApps, jobIngestion);

    // 5. Execute
    const result = await service.execute({
      userId: user.id,
      applicationId: params.id,
      archived,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/applications/:id/archive] Error:", error);

    if (error instanceof Error && error.message === "APPLICATION_NOT_FOUND") {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
