// app/api/applications/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { JobApplicationsRepository } from "@/repositories/JobApplicationsRepository";

interface ApplicationsListResponse {
  applications: {
    id: string;
    company: string | null;
    role: string | null;
    current_status: string | null;
    last_email_date_ts: number | null;
    last_email_message_id: string | null;
    thread_hint: string | null;
    created_at: string;
    updated_at: string;
  }[];
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json<{ error: string }>(
        { error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const apps = await JobApplicationsRepository.getAllForUser(user.id);

    const response: ApplicationsListResponse = {
      applications: apps.map((app) => ({
        id: app.id,
        company: app.company,
        role: app.role,
        current_status: app.current_status,
        last_email_date_ts: app.last_email_date_ts,
        last_email_message_id: app.last_email_message_id,
        thread_hint: app.thread_hint,
        created_at: app.created_at,
        updated_at: app.updated_at,
      })),
    };

    return NextResponse.json<ApplicationsListResponse>(response);
  } catch (err: unknown) {
    console.error("[API] /api/applications error:", err);
    return NextResponse.json<{ error: string }>(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
