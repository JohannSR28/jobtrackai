"use client";
import { useState, useEffect } from "react";

interface GmailConnectionState {
  connected: boolean;
  loading: boolean;
  error: string | null;
  connect: () => void;
  revoke: () => Promise<void>;
  checkStatus: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useGmailConnection(): GmailConnectionState {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Vérifie le statut de la connexion Gmail */
  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/google/status");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setConnected(data.connected);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  /** Lance le flux OAuth Gmail */
  const connect = () => {
    window.location.href = "/api/google/oauth/start";
  };

  /** Révoque la connexion Gmail */
  const revoke = async () => {
    if (!confirm("Révoquer l’accès à Gmail ?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/google/revoke", { method: "DELETE" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setConnected(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de révocation");
    } finally {
      setLoading(false);
    }
  };

  /** Vérifie automatiquement la connexion au montage */
  useEffect(() => {
    checkStatus();
  }, []);

  return {
    connected,
    loading,
    error,
    connect,
    revoke,
    checkStatus,
    refetch: checkStatus,
  };
}
