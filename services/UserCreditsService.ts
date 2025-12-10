// src/services/UserCreditsService.ts
import {
  CreditTransactionsRepository,
  CreditTransactionStatus,
} from "@/repositories/CreditTransactionsRepository";
import type { CreditTransaction } from "@/repositories/CreditTransactionsRepository";

export interface AddStripeCreditsServiceInput {
  userId: string;
  amount: number;
  metadata?: Record<string, unknown>;
  reason?: string;
  status?: CreditTransactionStatus;
}

export class UserCreditsService {
  static async getBalance(userId: string): Promise<number> {
    return CreditTransactionsRepository.getUserBalance(userId);
  }

  static async addStripeCredits(
    options: AddStripeCreditsServiceInput
  ): Promise<CreditTransaction> {
    return CreditTransactionsRepository.addStripeCredits(options);
  }
}
