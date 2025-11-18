import { createClient } from "@/utils/supabase/server";

/** Type de mise à jour autorisée sur scan_logs */
export interface ScanLogUpdate {
  status?:
    | "pending"
    | "running"
    | "completed"
    | "error"
    | "interrupted"
    | "empty";
  processed_count?: number;
  token_count?: number;
  credits_spent?: number;
  last_email_date?: number | null;
  job_email_count?: number;
  scan_duration_ms?: number;
  started_at?: number | null;
  last_update_at?: number | null;
  mail_ids?: string[];
  stop_requested?: true;
}

/** Type complet d’un log (optionnel pour findById, etc.) */
export interface ScanLog {
  id: string;
  user_id: string;
  period_start_ts: number;
  period_end_ts: number;
  email_count: number;
  mail_ids: string[];
  processed_count: number;
  job_email_count: number;
  token_count: number;
  credits_spent: number;
  status:
    | "pending"
    | "running"
    | "completed"
    | "error"
    | "interrupted"
    | "empty";
  started_at: number | null;
  last_email_date: number | null;
  scan_duration_ms: number;
  last_update_at: number | null;
  created_at?: string;
  stop_requested: boolean;
}

export class ScanLogsRepository {
  static async insert(entry: ScanLog) {
    const supabase = await createClient();
    const { error } = await supabase.from("scan_logs").insert(entry);
    if (error) throw new Error("Erreur d'insertion : " + error.message);
  }

  static async update(id: string, updates: ScanLogUpdate) {
    const supabase = await createClient();
    const { error } = await supabase
      .from("scan_logs")
      .update(updates)
      .eq("id", id);
    if (error) throw new Error("Erreur mise à jour : " + error.message);
  }

  static async findById(id: string): Promise<ScanLog | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("scan_logs")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data as ScanLog;
  }

  static async findLastCompleted(userId: string): Promise<ScanLog | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("scan_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("last_email_date", { ascending: false, nullsFirst: false })
      .limit(1)
      .single();

    if (error) return null;
    return data as ScanLog;
  }

  /**
   * Retourne le scan en cours ("running" ou "pending") pour un utilisateur.
   * Sert à empêcher le lancement de plusieurs scans simultanés.
   */
  static async findRunningByUser(userId: string): Promise<ScanLog | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("scan_logs")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["running", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Si aucun scan en cours, renvoyer null
    if (error && error.code === "PGRST116") return null;
    if (error) {
      console.warn("[ScanLogsRepository] Erreur findRunningByUser:", error);
      return null;
    }

    return data as ScanLog;
  }

  static async getAllForUser(userId: string): Promise<ScanLog[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("scan_logs")
      .select(
        "id, period_start_ts, period_end_ts, email_count, processed_count, token_count, credits_spent, scan_duration_ms, created_at, status"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error("Erreur récupération logs : " + error.message);
    return (data ?? []) as ScanLog[];
  }
}
