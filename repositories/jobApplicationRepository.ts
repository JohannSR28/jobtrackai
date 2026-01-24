import type { SupabaseClient } from "@supabase/supabase-js";
import type { JobApplication, JobStatus } from "@/services/jobDomain/types";

type JobAppRow = {
  id: string;
  user_id: string;

  company: string | null;
  position: string | null;
  status: JobStatus;

  applied_at: string | null;
  last_activity_at: string;

  notes: string | null;
  archived: boolean;
  created_by: "auto" | "user";

  created_at: string;
  updated_at: string;
};

function mapRow(r: JobAppRow): JobApplication {
  return {
    id: r.id,
    userId: r.user_id,

    company: r.company,
    position: r.position,
    status: r.status,

    appliedAt: r.applied_at,
    lastActivityAt: r.last_activity_at,

    notes: r.notes,
    archived: r.archived,
    createdBy: r.created_by,

    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export class JobApplicationRepository {
  constructor(private db: SupabaseClient) {}

  async create(input: {
    userId: string;
    company: string | null;
    position: string | null;
    createdBy: "auto" | "user";
  }): Promise<JobApplication> {
    const { data, error } = await this.db
      .from("job_applications")
      .insert({
        user_id: input.userId,
        company: input.company,
        position: input.position,
        created_by: input.createdBy,
      })
      .select("*")
      .single<JobAppRow>();

    if (error || !data) throw error ?? new Error("JOB_APP_CREATE_FAILED");
    return mapRow(data);
  }

  async findCandidateByCompanyPosition(input: {
    userId: string;
    company: string | null;
    position: string | null;
  }): Promise<JobApplication | null> {
    let q = this.db
      .from("job_applications")
      .select("*")
      .eq("user_id", input.userId)
      .eq("archived", false);

    //  company filter
    if (input.company === null) {
      q = q.is("company", null);
    } else {
      q = q.eq("company", input.company);
    }

    //  position filter
    if (input.position === null) {
      q = q.is("position", null);
    } else {
      q = q.eq("position", input.position);
    }

    const { data, error } = await q
      .order("last_activity_at", { ascending: false })
      .limit(1)
      .maybeSingle<JobAppRow>();

    if (error) throw error;
    return data ? mapRow(data) : null;
  }

  async updateSummary(input: {
    userId: string;
    applicationId: string;

    company: string | null;
    position: string | null;
    status: JobStatus;
    appliedAt: string | null;
    lastActivityAt: string;
  }): Promise<void> {
    const { error } = await this.db
      .from("job_applications")
      .update({
        company: input.company,
        position: input.position,
        status: input.status,
        applied_at: input.appliedAt,
        last_activity_at: input.lastActivityAt,
      })
      .eq("user_id", input.userId)
      .eq("id", input.applicationId);

    if (error) throw error;
  }

  async deleteHardById(input: {
    userId: string;
    applicationId: string;
  }): Promise<void> {
    const { error } = await this.db
      .from("job_applications")
      .delete()
      .eq("user_id", input.userId)
      .eq("id", input.applicationId);

    if (error) throw error;
  }

  async setArchived(input: {
    userId: string;
    applicationId: string;
    archived: boolean;
  }): Promise<void> {
    const { error } = await this.db
      .from("job_applications")
      .update({ archived: input.archived })
      .eq("user_id", input.userId)
      .eq("id", input.applicationId);

    if (error) throw error;
  }

  // JobApplicationRepository
  async updateFields(input: {
    userId: string;
    applicationId: string;

    company: string | null;
    position: string | null;
    status: JobStatus;
    notes: string | null;
  }): Promise<void> {
    const { error } = await this.db
      .from("job_applications")
      .update({
        company: input.company,
        position: input.position,
        status: input.status,
        notes: input.notes,
      })
      .eq("user_id", input.userId)
      .eq("id", input.applicationId);

    if (error) throw error;
  }

  async findMany(input: {
    userId: string;
    archived?: boolean;
    status?: JobStatus | "all";
    orderBy?: "last_activity_at" | "created_at";
    orderDir?: "asc" | "desc";
  }): Promise<JobApplication[]> {
    let query = this.db
      .from("job_applications")
      .select("*")
      .eq("user_id", input.userId);

    // Filtre archived
    if (input.archived !== undefined) {
      query = query.eq("archived", input.archived);
    }

    // Filtre status
    if (input.status && input.status !== "all") {
      query = query.eq("status", input.status);
    }

    // Tri
    const orderBy = input.orderBy ?? "last_activity_at";
    const orderDir = input.orderDir ?? "desc";
    query = query.order(orderBy, { ascending: orderDir === "asc" });

    const { data, error } = await query.returns<JobAppRow[]>();

    if (error) throw error;
    return (data ?? []).map(mapRow);
  }

  /**
   *  Compte les applications par statut
   */
  async countByStatus(input: {
    userId: string;
    archived?: boolean;
  }): Promise<Record<JobStatus | "all", number>> {
    let query = this.db
      .from("job_applications")
      .select("status")
      .eq("user_id", input.userId);

    if (input.archived !== undefined) {
      query = query.eq("archived", input.archived);
    }

    const { data, error } = await query.returns<{ status: JobStatus }[]>();

    if (error) throw error;

    const counts: Record<JobStatus | "all", number> = {
      all: data?.length ?? 0,
      applied: 0,
      interview: 0,
      rejection: 0,
      offer: 0,
      unknown: 0,
    };

    for (const row of data ?? []) {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
    }

    return counts;
  }

  /**
   *  Récupère une application par ID
   */
  async findById(input: {
    userId: string;
    applicationId: string;
  }): Promise<JobApplication | null> {
    const { data, error } = await this.db
      .from("job_applications")
      .select("*")
      .eq("user_id", input.userId)
      .eq("id", input.applicationId)
      .maybeSingle<JobAppRow>();

    if (error) throw error;
    return data ? mapRow(data) : null;
  }
}
