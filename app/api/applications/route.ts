// app/api/applications/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { JobApplicationRepository } from "@/repositories/jobApplicationRepository";
import { JobEmailRepository } from "@/repositories/jobEmailRepository";
import { GetApplicationsService } from "@/services/jobDomain/applications/getApplicationService";
import type { JobStatus } from "@/services/jobDomain/types";

/**
 * GET /api/applications
 *
 * Query params:
 * - archived: boolean (default: false)
 * - status: JobStatus | 'all' (default: 'all')
 * - page: number (default: 1)
 * - pageSize: number (default: 20)
 *
 * Response:
 * {
 *   applications: Bucket[],
 *   total: number,
 *   page: number,
 *   maxPage: number,
 *   statusCounts: Record<JobStatus | 'all', number>
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse query params
    const searchParams = request.nextUrl.searchParams;

    const archived = searchParams.get("archived") === "true";
    const status = (searchParams.get("status") ?? "all") as JobStatus | "all";
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

    // 3. Validate
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 }
      );
    }

    const validStatuses: Array<JobStatus | "all"> = [
      "all",
      "applied",
      "interview",
      "rejection",
      "offer",
      "unknown",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status parameter" },
        { status: 400 }
      );
    }

    // 4. Instantiate repositories + service
    const jobApps = new JobApplicationRepository(supabase);
    const jobEmails = new JobEmailRepository(supabase);
    const service = new GetApplicationsService(jobApps, jobEmails);

    // 5. Execute
    const result = await service.execute({
      userId: user.id,
      archived,
      status,
      page,
      pageSize,
    });

    // 6. Return
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[GET /api/applications] Error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
