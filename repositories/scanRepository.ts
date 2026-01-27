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

  range_start_at: string;
  range_end_at: string;
  cursor_at: string;

  processed_count: number;
  total_count: number;
  //  AJOUT
  tokens_cost: number;

  should_continue: boolean;
  error_message: string | null;

  created_at: string;
  updated_at: string;
};

// 2. AJOUT mapping vers l'objet Scan
function mapRow(r: ScanRow): Scan {
  return {
    id: r.id,
    userId: r.user_id,
    provider: r.provider,
    status: r.status,

    rangeStartAt: r.range_start_at,
    rangeEndAt: r.range_end_at,
    cursorAt: r.cursor_at,

    processedCount: r.processed_count,
    totalCount: r.total_count,

    // AJOUT (fallback à 0 si null)
    tokensCost: r.tokens_cost ?? 0,

    shouldContinue: r.should_continue,
    errorMessage: r.error_message,

    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

type ScanUpdatePatchDb = Partial<{
  status: ScanStatus;

  range_start_at: string;
  range_end_at: string;
  cursor_at: string;

  processed_count: number;
  total_count: number;
  should_continue: boolean;

  error_message: string | null;
  tokens_cost: number;
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

    rangeStartAt: string;
    rangeEndAt: string;
    cursorAt: string;

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

        range_start_at: input.rangeStartAt,
        range_end_at: input.rangeEndAt,
        cursor_at: input.cursorAt,

        processed_count: input.processedCount,
        total_count: input.totalCount,
        should_continue: input.shouldContinue,
        tokens_cost: 0,
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

      rangeStartAt: string;
      rangeEndAt: string;
      cursorAt: string;

      processedCount: number;
      totalCount: number;
      shouldContinue: boolean;

      errorMessage: string | null;
      tokensCost: number;
    }>
  ): Promise<Scan> {
    const dbPatch: ScanUpdatePatchDb = {};

    if (patch.status !== undefined) dbPatch.status = patch.status;

    if (patch.rangeStartAt !== undefined)
      dbPatch.range_start_at = patch.rangeStartAt;
    if (patch.rangeEndAt !== undefined) dbPatch.range_end_at = patch.rangeEndAt;
    if (patch.cursorAt !== undefined) dbPatch.cursor_at = patch.cursorAt;

    if (patch.processedCount !== undefined)
      dbPatch.processed_count = patch.processedCount;
    if (patch.totalCount !== undefined) dbPatch.total_count = patch.totalCount;
    if (patch.shouldContinue !== undefined)
      dbPatch.should_continue = patch.shouldContinue;

    if (patch.errorMessage !== undefined)
      dbPatch.error_message = patch.errorMessage;

    if (patch.tokensCost !== undefined) dbPatch.tokens_cost = patch.tokensCost;

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
    const current = await this.getByIdForUser(userId, scanId);
    if (!current) throw new Error("SCAN_NOT_FOUND");

    const patch: ScanUpdatePatchDb = {
      status: input.finalStatus,
      should_continue: false,
    };

    if (input.finalStatus === "completed") {
      patch.processed_count = current.totalCount;
      patch.error_message = null;
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
