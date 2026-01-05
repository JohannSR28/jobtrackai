import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MailProvider,
  Scan,
  ScanStatus,
  ScanRepository as IScanRepository,
} from "@/services/scanService";

type ScanRow = {
  id: string;
  user_id: string;
  provider: MailProvider;
  status: ScanStatus;

  message_ids: unknown | null; // jsonb
  processed_count: number;
  total_count: number;
  should_continue: boolean;

  error_message: string | null;

  created_at: string;
  updated_at: string;
};

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function mapRow(r: ScanRow): Scan {
  const ids = r.message_ids;

  // On accepte jsonb sous forme:
  // - ["id1","id2",...]
  // (si tu as une autre forme plus tard, on adaptera)
  const messageIds: string[] | null = isStringArray(ids) ? ids : null;

  return {
    id: r.id,
    userId: r.user_id,
    provider: r.provider,
    status: r.status,
    messageIds,
    processedCount: r.processed_count,
    totalCount: r.total_count,
    shouldContinue: r.should_continue,
    errorMessage: r.error_message,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

type ScanUpdatePatch = Partial<{
  status: ScanStatus;
  message_ids: string[] | null;
  processed_count: number;
  total_count: number;
  should_continue: boolean;
  error_message: string | null;
}>;

export class ScanRepository implements IScanRepository {
  constructor(private db: SupabaseClient) {}

  async findActiveScan(userId: string): Promise<Scan | null> {
    const { data, error } = await this.db
      .from("scans")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["created", "running", "paused"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return mapRow(data as unknown as ScanRow);
  }

  async getByIdForUser(userId: string, scanId: string): Promise<Scan | null> {
    const { data, error } = await this.db
      .from("scans")
      .select("*")
      .eq("id", scanId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return mapRow(data as unknown as ScanRow);
  }

  async create(input: {
    userId: string;
    provider: MailProvider;
    status: ScanStatus;
    messageIds: string[] | null;
    processedCount: number;
    totalCount: number;
    shouldContinue: boolean;
  }): Promise<Scan> {
    const { data, error } = await this.db
      .from("scans")
      .insert({
        user_id: input.userId,
        provider: input.provider,
        status: input.status,
        message_ids: input.messageIds,
        processed_count: input.processedCount,
        total_count: input.totalCount,
        should_continue: input.shouldContinue,
      })
      .select("*")
      .single();

    if (error) throw error;
    return mapRow(data as unknown as ScanRow);
  }

  async update(
    userId: string,
    scanId: string,
    patch: Partial<{
      status: ScanStatus;
      messageIds: string[] | null;
      processedCount: number;
      totalCount: number;
      shouldContinue: boolean;
      errorMessage: string | null;
    }>
  ): Promise<Scan> {
    const dbPatch: ScanUpdatePatch = {};

    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.messageIds !== undefined) dbPatch.message_ids = patch.messageIds;
    if (patch.processedCount !== undefined)
      dbPatch.processed_count = patch.processedCount;
    if (patch.totalCount !== undefined) dbPatch.total_count = patch.totalCount;
    if (patch.shouldContinue !== undefined)
      dbPatch.should_continue = patch.shouldContinue;
    if (patch.errorMessage !== undefined)
      dbPatch.error_message = patch.errorMessage;

    const { data, error } = await this.db
      .from("scans")
      .update(dbPatch)
      .eq("id", scanId)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) throw error;
    return mapRow(data as unknown as ScanRow);
  }

  async finalize(
    userId: string,
    scanId: string,
    input: {
      finalStatus: "completed" | "canceled" | "failed";
      errorMessage?: string;
    }
  ): Promise<Scan> {
    // 1) on lit le scan pour connaître total_count
    const current = await this.getByIdForUser(userId, scanId);
    if (!current) throw new Error("SCAN_NOT_FOUND");

    const patch: ScanUpdatePatch = {
      status: input.finalStatus,
      should_continue: false,
      message_ids: null,
    };

    if (input.finalStatus === "completed") {
      patch.processed_count = current.totalCount;
    }

    if (input.finalStatus === "failed") {
      patch.error_message = input.errorMessage ?? "UNKNOWN_ERROR";
    }

    const { data, error } = await this.db
      .from("scans")
      .update(patch)
      .eq("id", scanId)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) throw error;
    return mapRow(data as unknown as ScanRow);
  }
}
