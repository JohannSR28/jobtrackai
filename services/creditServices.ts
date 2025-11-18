// src/services/CreditService.ts
import { CreditTransactionsRepository } from "@/repositories/CreditTransactionsRepository";
import { UserCreditBalanceRepository } from "@/repositories/UserCreditBalanceRepository";
import type { CreditSource } from "@/repositories/CreditTransactionsRepository";

export class CreditService {
  /** 🔹 Crée une transaction "simple" (bonus, Stripe, etc.) */
  static async createTransaction({
    userId,
    amount,
    source,
    reason,
    metadata = {},
  }: {
    userId: string;
    amount: number; // + = crédit, - = débit
    source: CreditSource;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): Promise<number> {
    await CreditTransactionsRepository.insert({
      user_id: userId,
      scan_id: null,
      amount,
      source,
      reason: reason ?? null,
      metadata,
      status: "completed",
    });

    // Retourne le nouveau solde
    return await UserCreditBalanceRepository.getBalance(userId);
  }

  /** 🔹 Débit progressif spécifique à un scan (une seule ligne par scan) */
  static async debitProgressive({
    userId,
    scanId,
    delta,
  }: {
    userId: string;
    scanId: string;
    delta: number;
  }): Promise<number> {
    if (delta <= 0) {
      return await UserCreditBalanceRepository.getBalance(userId);
    }

    // Chercher une transaction existante pour ce scan
    const existing = await CreditTransactionsRepository.findByScanId(scanId);

    if (!existing) {
      // Première fois -> créer la ligne avec montant négatif
      await CreditTransactionsRepository.insert({
        user_id: userId,
        scan_id: scanId,
        amount: -delta,
        source: "scan",
        reason: "Débit progressif pour le scan",
        metadata: {},
        status: "completed",
      });
    } else {
      // Déjà une ligne -> on la met à jour : amount -= delta
      const newAmount = existing.amount - delta;
      await CreditTransactionsRepository.updateAmountById(
        existing.id as string,
        newAmount
      );
    }

    // Nouveau solde global
    return await UserCreditBalanceRepository.getBalance(userId);
  }

  /** 🔹 Lecture simple du solde via la VIEW */
  static async getBalance(userId: string): Promise<number> {
    return await UserCreditBalanceRepository.getBalance(userId);
  }
}
