// src/repositories/UserCreditBalanceRepository.ts
import { createClient } from "@/utils/supabase/server";

export interface UserCreditBalance {
  user_id: string;
  credits: number;
}

export class UserCreditBalanceRepository {
  static async getBalance(userId: string): Promise<number> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_credit_balance")
      .select("credits")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.warn(
        "[UserCreditBalanceRepository] getBalance error:",
        error.message
      );
      return 0;
    }

    return (data?.credits as number | undefined) ?? 0;
  }
}
