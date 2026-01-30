import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { JobApplicationRepository } from "@/repositories/jobApplicationRepository";
import { JobEmailRepository } from "@/repositories/jobEmailRepository";
import { JobIngestionService } from "@/services/jobDomain/JobIngestionService";
import { UpdateApplicationService } from "@/services/jobDomain/applications/updateApplicationService";
import { DeleteApplicationService } from "@/services/jobDomain/applications/deleteApplicationService";
import type { JobStatus } from "@/services/jobDomain/types";

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

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
    const { company, position, status, notes } = body;

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

    // 4. Instantiate service
    const jobApps = new JobApplicationRepository(supabase);
    const service = new UpdateApplicationService(jobApps);

    // 5. Execute
    const updated = await service.execute({
      userId: user.id,
      applicationId: params.id,
      company,
      position,
      status,
      notes,
    });

    return NextResponse.json({ application: updated }, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/applications/:id] Error:", error);

    if (error instanceof Error && error.message === "APPLICATION_NOT_FOUND") {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }, // ✅ Correction du type
) {
  const params = await props.params; // ✅ Await des params

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

    // 2. Instantiate repositories + services
    const jobApps = new JobApplicationRepository(supabase);
    const jobEmails = new JobEmailRepository(supabase);
    const jobIngestion = new JobIngestionService(jobEmails, jobApps);
    const service = new DeleteApplicationService(jobApps, jobIngestion);

    // 3. Execute
    const result = await service.execute({
      userId: user.id,
      applicationId: params.id,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/applications/:id] Error:", error);

    if (error instanceof Error && error.message === "APPLICATION_NOT_FOUND") {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
