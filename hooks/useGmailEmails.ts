"use client";
import { useState } from "react";
import type { GmailMessage } from "@/services/gmailApiService";

/**
 * Hook pour récupérer les e-mails Gmail depuis ton backend Next.js
 * - fetchEmailsByDateRange(start, end)
 * - fetchRecentEmails(limit)
 * - fetchEmailsSinceLastScan()
 */
export function useGmailEmails() {
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Récupère les e-mails entre deux dates */
  async function fetchEmailsByDateRange(start: string, end: string) {
    if (!start || !end) {
      setError("Veuillez choisir une plage de dates.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/google/gmail/date-range?start=${start}&end=${end}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEmails(data.emails ?? []);
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
    fetchEmailsByDateRange,
  };
}
