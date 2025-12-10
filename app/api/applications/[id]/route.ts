// app/api/applications/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { JobApplicationsRepository } from "@/repositories/JobApplicationsRepository";
import { JobEmailsRepository } from "@/repositories/JobEmailsRepository";

interface ApplicationDetailResponse {
  application: {
    id: string;
    company: string | null;
    role: string | null;
    current_status: string | null;
    last_email_message_id: string | null;
    last_email_date_ts: number | null;
    thread_hint: string | null;
    created_at: string;
    updated_at: string;
  };
  emails: {
    id: string;
    message_id: string;
    status: string;
    company: string | null;
    role: string | null;
    email_date_ts: number | null;
    provider: string;
    created_at?: string;
  }[];
}

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  _req: Request,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const { id: applicationId } = await context.params;
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

    // 1) Récupérer l'application
    const app = await JobApplicationsRepository.findByIdForUser(
      user.id,
      applicationId
    );

    if (!app) {
      return NextResponse.json<{ error: string }>(
        { error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // 2) Récupérer les emails liés
    const emails = await JobEmailsRepository.getForApplication(
      user.id,
      applicationId
    );

    const response: ApplicationDetailResponse = {
      application: {
        id: app.id,
        company: app.company,
        role: app.role,
        current_status: app.current_status,
        last_email_message_id: app.last_email_message_id,
        last_email_date_ts: app.last_email_date_ts,
        thread_hint: app.thread_hint,
        created_at: app.created_at,
        updated_at: app.updated_at,
      },
      emails: emails.map((email) => ({
        id: email.id,
        message_id: email.message_id,
        status: email.status,
        company: email.company ?? null,
        role: email.role ?? null,
        email_date_ts: email.email_date_ts ?? null,
        provider: email.provider,
        created_at: email.created_at,
      })),
    };

    return NextResponse.json<ApplicationDetailResponse>(response);
  } catch (err: unknown) {
    console.error("[API] /api/applications/[id] error:", err);
    return NextResponse.json<{ error: string }>(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
