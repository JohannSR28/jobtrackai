import type { SupabaseClient } from "@supabase/supabase-js";

export class TransactionRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Récupère le solde actuel
   */
  async getBalance(userId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("user_wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (error || !data) return 0; // Par défaut 0 si pas de wallet
    return data.balance;
  }

  /**
   * Crée une transaction (Débit ou Crédit)
   * Le trigger DB mettra à jour le wallet automatiquement.
   */
  async createTransaction(input: {
    userId: string;
    amount: number; // Négatif pour un débit
    type: "SCAN_USAGE" | "PURCHASE" | "BONUS" | "REFUND";
    description?: string;
    referenceId?: string; // ID du scan
  }): Promise<void> {
    const { error } = await this.supabase.from("token_transactions").insert({
      user_id: input.userId,
      amount: input.amount,
      type: input.type,
      description: input.description,
      reference_id: input.referenceId,
    });

    if (error) throw error;
  }
}
