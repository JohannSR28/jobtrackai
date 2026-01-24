// app/api/emails/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { JobEmailRepository } from "@/repositories/jobEmailRepository";
import { JobApplicationRepository } from "@/repositories/jobApplicationRepository";
import { JobIngestionService } from "@/services/jobDomain/JobIngestionService";
import { UpdateEmailService } from "@/services/jobDomain/emails/updateEmailService";
import type { JobStatus } from "@/services/jobDomain/types";

/**
 * PATCH /api/emails/:id
 *
 * Body:
 * {
 *   company?: string | null,
 *   position?: string | null,
 *   status?: JobStatus,
 *   eventType?: string | null
 * }
 *
 * Response:
 * {
 *   email: JobEmail,
 *   applicationUpdated?: JobApplication
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
    const { company, position, status, eventType } = body;

    // 3. Validate status if provided
    if (status) {
      const validStatuses: JobStatus[] = [
        "applied",
        "interview",
        "rejection",
        "offer",
        "unknown",
      ];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
    }

    // 4. Instantiate repositories + services
    const jobEmails = new JobEmailRepository(supabase);
    const jobApps = new JobApplicationRepository(supabase);
    const jobIngestion = new JobIngestionService(jobEmails, jobApps);
    const service = new UpdateEmailService(jobEmails, jobIngestion);

    // 5. Execute
    const result = await service.execute({
      userId: user.id,
      jobEmailId: params.id,
      company,
      position,
      status,
      eventType,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/emails/:id] Error:", error);

    if (error instanceof Error && error.message === "EMAIL_NOT_FOUND") {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
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
