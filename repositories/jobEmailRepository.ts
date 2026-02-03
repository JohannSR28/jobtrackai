import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  JobEmail,
  JobMailProvider,
  JobStatus,
} from "@/services/jobDomain/types";
import {
  encryptSnippet,
  decryptSnippet,
} from "@/utils/crypto/emailSnippetCrypto";

type JobEmailRow = {
  id: string;
  user_id: string;
  provider: JobMailProvider;
  provider_message_id: string;
  received_at: string;

  from_text: string | null;
  subject: string | null;
  snippet: string | null;

  company: string | null;
  position: string | null;
  status: JobStatus;
  event_type: string | null;
  confidence: number;

  application_id: string | null;
  archived: boolean;

  created_at: string;
  updated_at: string;
};

function mapRow(r: JobEmailRow): JobEmail {
  return {
    id: r.id,
    userId: r.user_id,
    provider: r.provider,
    providerMessageId: r.provider_message_id,
    receivedAt: r.received_at,

    fromText: r.from_text,
    subject: r.subject,
    snippet: decryptSnippet(r.snippet),

    company: r.company,
    position: r.position,
    status: r.status,
    eventType: r.event_type,
    confidence: r.confidence,

    applicationId: r.application_id,
    isArchived: r.archived,

    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export class JobEmailRepository {
  constructor(private db: SupabaseClient) {}

  async upsertByProviderMessage(input: {
    userId: string;
    provider: JobMailProvider;
    providerMessageId: string;

    receivedAt: string;

    fromText: string | null;
    subject: string | null;
    snippet: string | null;

    company: string | null;
    position: string | null;
    status: JobStatus;
    eventType: string | null;
    confidence: number;
  }): Promise<JobEmail> {
    const { data, error } = await this.db
      .from("job_emails")
      .upsert(
        {
          user_id: input.userId,
          provider: input.provider,
          provider_message_id: input.providerMessageId,
          received_at: input.receivedAt,

          from_text: input.fromText,
          subject: input.subject,
          snippet: encryptSnippet(input.snippet),

          company: input.company,
          position: input.position,
          status: input.status,
          event_type: input.eventType,
          confidence: input.confidence,
        },
        { onConflict: "user_id,provider,provider_message_id" },
      )
      .select("*")
      .single<JobEmailRow>();

    if (error || !data) throw error ?? new Error("JOB_EMAIL_UPSERT_FAILED");
    return mapRow(data);
  }

  async attachToApplication(input: {
    userId: string;
    jobEmailId: string;
    applicationId: string | null; // null = detach
  }): Promise<void> {
    const { error } = await this.db
      .from("job_emails")
      .update({ application_id: input.applicationId })
      .eq("user_id", input.userId)
      .eq("id", input.jobEmailId);

    if (error) throw error;
  }

  async listByApplication(input: {
    userId: string;
    applicationId: string;
  }): Promise<JobEmail[]> {
    const { data, error } = await this.db
      .from("job_emails")
      .select("*")
      .eq("user_id", input.userId)
      .eq("application_id", input.applicationId)
      .eq("archived", false)
      .order("received_at", { ascending: false })
      .returns<JobEmailRow[]>();

    if (error) throw error;
    return (data ?? []).map(mapRow);
  }

  async deleteHardByApplicationId(input: {
    userId: string;
    applicationId: string;
  }): Promise<number> {
    const { error, count } = await this.db
      .from("job_emails")
      .delete({ count: "exact" })
      .eq("user_id", input.userId)
      .eq("application_id", input.applicationId);

    if (error) throw error;
    return count ?? 0;
  }

  async deleteHardById(input: {
    userId: string;
    jobEmailId: string;
  }): Promise<void> {
    const { error } = await this.db
      .from("job_emails")
      .delete()
      .eq("user_id", input.userId)
      .eq("id", input.jobEmailId);

    if (error) throw error;
  }

  async setArchivedByApplicationId(input: {
    userId: string;
    applicationId: string;
    archived: boolean;
  }): Promise<number> {
    const { error, count } = await this.db
      .from("job_emails")
      .update({ archived: input.archived }, { count: "exact" })
      .eq("user_id", input.userId)
      .eq("application_id", input.applicationId);

    if (error) throw error;
    return count ?? 0;
  }

  async setArchivedById(input: {
    userId: string;
    jobEmailId: string;
    archived: boolean;
  }): Promise<void> {
    const { error } = await this.db
      .from("job_emails")
      .update({ archived: input.archived })
      .eq("user_id", input.userId)
      .eq("id", input.jobEmailId);

    if (error) throw error;
  }

  async findManyByApplicationIds(input: {
    userId: string;
    applicationIds: string[];
    archived?: boolean;
  }): Promise<JobEmail[]> {
    if (input.applicationIds.length === 0) {
      return [];
    }

    let query = this.db
      .from("job_emails")
      .select("*")
      .eq("user_id", input.userId)
      .in("application_id", input.applicationIds);

    if (input.archived !== undefined) {
      query = query.eq("archived", input.archived);
    }

    query = query.order("received_at", { ascending: false });

    const { data, error } = await query.returns<JobEmailRow[]>();

    if (error) throw error;
    return (data ?? []).map(mapRow);
  }

  /**
   * Récupère les emails non assignés (application_id = null)
   */
  async findUnassigned(input: {
    userId: string;
    archived?: boolean;
  }): Promise<JobEmail[]> {
    let query = this.db
      .from("job_emails")
      .select("*")
      .eq("user_id", input.userId)
      .is("application_id", null);

    if (input.archived !== undefined) {
      query = query.eq("archived", input.archived);
    }

    query = query.order("received_at", { ascending: false });

    const { data, error } = await query.returns<JobEmailRow[]>();

    if (error) throw error;
    return (data ?? []).map(mapRow);
  }

  /**
   * 🆕 Récupère un email par ID
   */
  async findById(input: {
    userId: string;
    jobEmailId: string;
  }): Promise<JobEmail | null> {
    const { data, error } = await this.db
      .from("job_emails")
      .select("*")
      .eq("user_id", input.userId)
      .eq("id", input.jobEmailId)
      .maybeSingle<JobEmailRow>();

    if (error) throw error;
    return data ? mapRow(data) : null;
  }

  /**
   *  Met à jour les champs modifiables d'un email
   */
  async updateEmailFields(input: {
    userId: string;
    jobEmailId: string;
    company: string | null;
    position: string | null;
    status: JobStatus;
    eventType: string | null;
  }): Promise<void> {
    const { error } = await this.db
      .from("job_emails")
      .update({
        company: input.company,
        position: input.position,
        status: input.status,
        event_type: input.eventType,
      })
      .eq("user_id", input.userId)
      .eq("id", input.jobEmailId);

    if (error) throw error;
  }

  async moveEmailsToApplication(input: {
    userId: string;
    sourceAppId: string;
    targetAppId: string;
  }): Promise<void> {
    const { error } = await this.db
      .from("job_emails")
      .update({
        application_id: input.targetAppId,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", input.userId)
      .eq("application_id", input.sourceAppId);

    if (error) throw error;
  }
}
