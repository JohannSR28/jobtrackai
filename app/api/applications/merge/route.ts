import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { JobApplicationRepository } from "@/repositories/jobApplicationRepository";
import { JobEmailRepository } from "@/repositories/jobEmailRepository";
import { MergeApplicationService } from "@/services/jobDomain/applications/mergeApplicationService";

export async function POST(request: NextRequest) {
  try {
    // 1. Auth Check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Body
    const body = await request.json();
    const { targetId, sourceId, finalData } = body;

    // 3. Basic Validation
    if (!targetId || !sourceId || !finalData) {
      return NextResponse.json(
        { error: "Missing required fields (targetId, sourceId, finalData)" },
        { status: 400 },
      );
    }

    // 4. Instantiate dependencies
    const jobApps = new JobApplicationRepository(supabase);
    const jobEmails = new JobEmailRepository(supabase);
    const service = new MergeApplicationService(jobApps, jobEmails);

    // 5. Execute Service
    await service.execute({
      userId: user.id,
      targetAppId: targetId,
      sourceAppId: sourceId,
      finalData: {
        company: finalData.company,
        position: finalData.position,
        status: finalData.status,
        notes: finalData.notes,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/applications/merge] Error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
