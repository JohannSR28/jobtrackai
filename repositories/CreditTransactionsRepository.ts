// src/repositories/CreditTransactionsRepository.ts
import { createClient } from "@/utils/supabase/server";

export type CreditSource =
  | "scan"
  | "stripe"
  | "bonus_signup"
  | "manual"
  | "refund";

export interface CreditTransaction {
  id?: string;
  user_id: string;
  scan_id?: string | null;
  amount: number; // +credit / -debit
  source: CreditSource;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  status?: "pending" | "completed" | "failed";
  created_at?: string;
}

export class CreditTransactionsRepository {
  static async insert(tx: CreditTransaction): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("credit_transactions").insert(tx);
    if (error) {
      throw new Error(
        `[CreditTransactionsRepository] insert error: ${error.message}`
      );
    }
  }

  static async findByScanId(scanId: string): Promise<CreditTransaction | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("scan_id", scanId)
      .eq("source", "scan")
      .limit(1)
      .single();

    if (error) return null;
    return data as CreditTransaction;
  }

  static async updateAmountById(id: string, newAmount: number): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("credit_transactions")
      .update({ amount: newAmount })
      .eq("id", id);

    if (error) {
      throw new Error(
        `[CreditTransactionsRepository] updateAmount error: ${error.message}`
      );
    }
  }
}
