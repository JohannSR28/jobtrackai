"use client";
import { useState } from "react";
import type { GmailMessage } from "@/services/gmailClient";

/**
 * Hook pour récupérer les e-mails Gmail depuis ton backend Next.js
 * - fetchEmailsByDateRange(start, end)  -> /api/google/gmail/date-range
 * - fetchRecentEmails()                 -> /api/google/gmail/last-50
 */
export function useGmailEmails() {
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Récupère les 50 derniers e-mails (nouveau endpoint) */
  async function fetchRecentEmails() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/google/gmail/last-50`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // le endpoint last-50 renvoie { messages: GmailMessage[] }
      setEmails(data.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return {
    emails,
    loading,
    error,
    fetchRecentEmails,
  };
}
