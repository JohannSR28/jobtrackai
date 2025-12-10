// src/repositories/JobEmailsRepository.ts
import { createClient } from "@/utils/supabase/server";
import type { MailProvider } from "@/services/MailConnectionsService";

export type JobEmailStatus =
  | "applied"
  | "in_review"
  | "interview"
  | "offer"
  | "rejected"
  | "manual";

export interface JobEmailInsert {
  user_id: string;
  provider: MailProvider;
  message_id: string;
  status: JobEmailStatus;
  company?: string | null;
  role?: string | null;
  email_date_ts?: number | null;
  application_id?: string | null;
}

export interface JobEmail extends JobEmailInsert {
  id: string;
  created_at?: string;
  application_id?: string | null;
}

interface PostgrestErrorLike {
  code?: string;
  message?: string;
}

/** Type guard: vérifie si l'erreur est un "no row found" */
function isNoRowError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as PostgrestErrorLike;
  return e.code === "PGRST116";
}

export class JobEmailsRepository {
  static async insert(email: JobEmailInsert): Promise<JobEmail> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("job_emails")
      .insert(email)
      .select("*")
      .single();

    if (error) {
      throw new Error(
        "[JobEmailsRepository] Erreur d'insertion : " + error.message
      );
    }

    return data as JobEmail;
  }

  /** insert qui ignore les doublons (unique constraint) */
  static async insertIgnoreDuplicate(
    email: JobEmailInsert
  ): Promise<JobEmail | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("job_emails")
      .insert(email)
      .select("*")
      .single();

    if (error) {
      const code = (error as PostgrestErrorLike).code;
      if (code === "23505") {
        // violation de contrainte unique → on ignore
        console.warn("[JobEmailsRepository] Duplicate job_email ignoré", {
          user_id: email.user_id,
          provider: email.provider,
          message_id: email.message_id,
        });
        return null;
      }

      throw new Error(
        "[JobEmailsRepository] Erreur insertIgnoreDuplicate : " + error.message
      );
    }

    return data as JobEmail;
  }

  static async insertMany(emails: JobEmailInsert[]): Promise<void> {
    if (emails.length === 0) return;

    const supabase = await createClient();
    const { error } = await supabase.from("job_emails").insert(emails);

    if (error) {
      throw new Error(
        "[JobEmailsRepository] Erreur insertMany : " + error.message
      );
    }
  }

  static async getAllForUser(userId: string): Promise<JobEmail[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("job_emails")
      .select("*")
      .eq("user_id", userId)
      .order("email_date_ts", { ascending: false });

    if (error) {
      throw new Error(
        "[JobEmailsRepository] Erreur getAllForUser : " + error.message
      );
    }

    return (data ?? []) as JobEmail[];
  }

  static async findByMessageId(
    userId: string,
    provider: MailProvider,
    messageId: string
  ): Promise<JobEmail | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("job_emails")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", provider)
      .eq("message_id", messageId)
      .single();

    if (error) {
      if (isNoRowError(error)) return null;
      console.warn("[JobEmailsRepository] Erreur findByMessageId :", error);
      return null;
    }

    return data as JobEmail;
  }

  static async getForApplication(
    userId: string,
    applicationId: string
  ): Promise<JobEmail[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("job_emails")
      .select("*")
      .eq("user_id", userId)
      .eq("application_id", applicationId)
      .order("email_date_ts", { ascending: true });

    if (error) {
      throw new Error(
        "[JobEmailsRepository] Erreur getForApplication : " + error.message
      );
    }

    return (data ?? []) as JobEmail[];
  }
}
