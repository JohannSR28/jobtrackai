import { createClient } from "@/utils/supabase/server";
import type { JobEmailStatus } from "@/repositories/JobEmailsRepository";

export type JobApplicationStatus = JobEmailStatus | "unknown";

export interface JobApplication {
  id: string;
  user_id: string;
  company: string | null;
  role: string | null;
  current_status: string | null;
  last_email_message_id: string | null;
  last_email_date_ts: number | null;
  thread_hint: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobApplicationInsert {
  user_id: string;
  company?: string | null;
  role?: string | null;
  current_status?: string | null;
  last_email_message_id?: string | null;
  last_email_date_ts?: number | null;
  thread_hint?: string | null;
}

export interface JobApplicationUpdate {
  company?: string | null;
  role?: string | null;
  current_status?: string | null;
  last_email_message_id?: string | null;
  last_email_date_ts?: number | null;
  thread_hint?: string | null;
  updated_at?: string;
}

export class JobApplicationsRepository {
  static async insertInitial(
    entry: JobApplicationInsert
  ): Promise<JobApplication> {
    const supabase = await createClient();

    const nowIso = new Date().toISOString();

    const payload = {
      user_id: entry.user_id,
      company: entry.company ?? null,
      role: entry.role ?? null,
      current_status: entry.current_status ?? null,
      last_email_message_id: entry.last_email_message_id ?? null,
      last_email_date_ts: entry.last_email_date_ts ?? null,
      thread_hint: entry.thread_hint ?? null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const { data, error } = await supabase
      .from("job_applications")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw new Error(
        "[JobApplicationsRepository] insertInitial error: " + error.message
      );
    }

    return data as JobApplication;
  }

  static async update(
    id: string,
    updates: JobApplicationUpdate
  ): Promise<JobApplication> {
    const supabase = await createClient();

    const payload = {
      ...updates,
      updated_at: updates.updated_at ?? new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("job_applications")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(
        "[JobApplicationsRepository] update error: " + error.message
      );
    }

    return data as JobApplication;
  }

  /**
   * Application trouvée par thread_hint (si on a un équivalent de threadId).
   */
  static async findByThreadHint(
    userId: string,
    threadHint: string
  ): Promise<JobApplication | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("job_applications")
      .select("*")
      .eq("user_id", userId)
      .eq("thread_hint", threadHint)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(
        "[JobApplicationsRepository] findByThreadHint error: " + error.message
      );
    }

    return (data as JobApplication | null) ?? null;
  }

  /**
   * Fallback: retrouver une application par company + role
   * (recherche simple, sans fuzzy).
   */
  static async findByCompanyAndRole(
    userId: string,
    company: string,
    role: string
  ): Promise<JobApplication | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("job_applications")
      .select("*")
      .eq("user_id", userId)
      .ilike("company", company)
      .ilike("role", role)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(
        "[JobApplicationsRepository] findByCompanyAndRole error: " +
          error.message
      );
    }

    return (data as JobApplication | null) ?? null;
  }

  static async getAllForUser(userId: string): Promise<JobApplication[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("job_applications")
      .select("*")
      .eq("user_id", userId)
      .order("last_email_date_ts", { ascending: false });

    if (error) {
      throw new Error(
        "[JobApplicationsRepository] getAllForUser error: " + error.message
      );
    }

    return (data ?? []) as JobApplication[];
  }

  static async findByIdForUser(
    userId: string,
    applicationId: string
  ): Promise<JobApplication | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("job_applications")
      .select("*")
      .eq("user_id", userId)
      .eq("id", applicationId)
      .maybeSingle();

    if (error) {
      throw new Error(
        "[JobApplicationsRepository] findByIdForUser error: " + error.message
      );
    }

    return (data as JobApplication | null) ?? null;
  }
}
