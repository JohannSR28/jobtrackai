// src/repositories/CreditTransactionsRepository.ts
import { createClient } from "@/utils/supabase/server";

export type CreditSource = "stripe" | "bonus_signup" | "refund";
export type CreditTransactionStatus = "pending" | "completed" | "failed";

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  source: CreditSource;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  status: CreditTransactionStatus;
  created_at: string;
}

export interface UserBalanceRow {
  user_id: string;
  credits: number;
}

export interface AddStripeCreditsInput {
  userId: string;
  amount: number;
  metadata?: Record<string, unknown>;
  reason?: string;
  status?: CreditTransactionStatus;
}

export class CreditTransactionsRepository {
  /**
   * 1) Ajouter des crédits via Stripe.
   *
   *   - amount doit être > 0 (contrainte SQL)
   *   - source = 'stripe'
   *   - metadata peut contenir l'id de session Stripe, le payment_intent, etc.
   */
  static async addStripeCredits(
    options: AddStripeCreditsInput
  ): Promise<CreditTransaction> {
    const supabase = await createClient();

    const { userId, amount, metadata, reason, status } = options;

    if (amount <= 0) {
      throw new Error(
        "[CreditTransactionsRepository] Stripe amount must be > 0"
      );
    }

    const payload = {
      user_id: userId,
      amount,
      source: "stripe" as const,
      reason: reason ?? "Achat de crédits via Stripe",
      metadata: metadata ?? {},
      status: status ?? "completed",
    };

    const { data, error } = await supabase
      .from("credit_transactions")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw new Error(
        "[CreditTransactionsRepository] addStripeCredits error: " +
          error.message
      );
    }

    return data as CreditTransaction;
  }

  /**
   * 2) Récupérer le solde de crédits de l'utilisateur.
   *
   *   - Lecture directe de la vue user_balance_view
   *   - Si aucune ligne -> 0 crédits.
   */
  static async getUserBalance(userId: string): Promise<number> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("user_balance_view")
      .select("credits")
      .eq("user_id", userId)
      .single();

    if (error) {
      // Si la vue ne renvoie aucune ligne pour ce user,
      // on considère que son solde est 0.
      // PGRST116 = "No rows found" côté PostgREST
      if ((error as { code?: string }).code === "PGRST116") {
        return 0;
      }

      throw new Error(
        "[CreditTransactionsRepository] getUserBalance error: " + error.message
      );
    }

    const row = data as UserBalanceRow;
    return row.credits ?? 0;
  }
}
