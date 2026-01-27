"use client";

import { useState, useEffect, useCallback } from "react";

export function useWallet() {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet/balance");
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
      }
    } catch (e) {
      console.error("Failed to fetch balance", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger au montage
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    loading,
    refreshBalance: fetchBalance,
  };
}
