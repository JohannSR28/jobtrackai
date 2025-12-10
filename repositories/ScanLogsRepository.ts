import { createClient } from "@/utils/supabase/server";

export type ScanStatus =
  | "pending"
  | "running"
  | "completed"
  | "error"
  | "interrupted"
  | "empty";

export interface ScanLog {
  id: string;
  user_id: string;
  period_start_ts: number;
  period_end_ts: number;
  email_count: number;
  processed_count: number;
  job_email_count: number;
  token_count: number;
  credits_spent: number;
  status: ScanStatus;
  started_at: number | null;
  last_email_date: number | null;
  scan_duration_ms: number;
  last_update_at: number | null;
  created_at?: string;
  stop_requested: boolean;
  credit_settled: boolean;
  // facultatif, car tu peux ne jamais l'utiliser côté TS
  mail_ids?: string[] | null;
}

export interface ScanLogInsert {
  user_id: string;
  period_start_ts: number;
  period_end_ts: number;
  email_count: number;
  status?: ScanStatus;
  started_at?: number | null;
  last_update_at?: number | null;
}

/**
 * Champs que l’on peut mettre à jour après coup.
 * Tous optionnels, y compris credit_settled.
 */
export interface ScanLogUpdate {
  status?: ScanStatus;
  processed_count?: number;
  job_email_count?: number;
  token_count?: number;
  credits_spent?: number;
  last_email_date?: number | null;
  scan_duration_ms?: number;
  last_update_at?: number | null;
  stop_requested?: boolean;
  credit_settled?: boolean;
}

export class ScanLogsRepository {
  /**
   * Crée un nouveau log de scan (appelé au moment du prepare/init).
   *
   * -> ICI on applique ta logique :
   *    - credits_spent = email_count (pré-débit)
   *    - credit_settled = false
   */
  static async insertInitial(entry: ScanLogInsert): Promise<ScanLog> {
    const supabase = await createClient();

    const now = Date.now();

    const payload = {
      user_id: entry.user_id,
      period_start_ts: entry.period_start_ts,
      period_end_ts: entry.period_end_ts,
      email_count: entry.email_count,
      processed_count: 0,
      job_email_count: 0,
      token_count: 0,
      // Pré-débit : 1 crédit par mail
      credits_spent: entry.email_count,
      credit_settled: false,
      status: entry.status ?? "running",
      started_at: entry.started_at ?? now,
      last_email_date: null,
      scan_duration_ms: 0,
      last_update_at: entry.last_update_at ?? now,
      stop_requested: false,
      // mail_ids laissé vide par défaut, Supabase utilisera DEFAULT '{}'
    };

    const { data, error } = await supabase
      .from("scan_logs")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw new Error(
        "[ScanLogsRepository] Erreur d'insertion : " + error.message
      );
    }

    return data as ScanLog;
  }

  static async findById(id: string): Promise<ScanLog | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("scan_logs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return null;
    }

    return data as ScanLog;
  }

  static async findLastAny(userId: string): Promise<ScanLog | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("scan_logs")
      .select("*")
      .eq("user_id", userId)
      .order("period_end_ts", { ascending: false })
      .limit(1)
      .single();

    if (error) return null;
    return data as ScanLog;
  }

  /**
   * Scan en cours pour un utilisateur (pending ou running).
   * Utilisé par scanBatchForUser pour mettre à jour le bon log.
   */
  static async findRunningByUser(userId: string): Promise<ScanLog | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("scan_logs")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["pending", "running"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return null;
    }

    return data as ScanLog;
  }

  /**
   * Mise à jour partielle d'un log de scan.
   */
  static async update(id: string, updates: ScanLogUpdate): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from("scan_logs")
      .update(updates)
      .eq("id", id);

    if (error) {
      throw new Error(
        "[ScanLogsRepository] Erreur de mise à jour : " + error.message
      );
    }
  }

  /** Tous les scans en cours pour un user (pending + running) */
  static async findAllRunningByUser(userId: string): Promise<ScanLog[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("scan_logs")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["pending", "running"])
      .order("created_at", { ascending: true });

    if (error) {
      return [];
    }

    return (data ?? []) as ScanLog[];
  }

  /** Helper : marquer un scan comme COMPLETED (sans toucher aux crédits ici) */
  static async markAsCompleted(
    id: string,
    nowMs: number,
    durationMs: number
  ): Promise<void> {
    await this.update(id, {
      status: "completed",
      scan_duration_ms: durationMs,
      last_update_at: nowMs,
    });
  }

  /** Helper : marquer un scan comme INTERRUPTED */
  static async markAsInterrupted(
    id: string,
    nowMs: number,
    durationMs: number
  ): Promise<void> {
    await this.update(id, {
      status: "interrupted",
      scan_duration_ms: durationMs,
      last_update_at: nowMs,
    });
  }
}
