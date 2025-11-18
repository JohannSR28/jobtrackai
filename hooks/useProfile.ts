import { useEffect, useState, useCallback } from "react";
import type { Profile } from "@/types/profile";
import { getErrorMessage } from "@/utils/error";

export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/profile`);
      if (!res.ok) throw new Error("Failed to fetch profile");

      const data: Profile = await res.json();
      setProfile(data);
      setError(null);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (!userId) throw new Error("No user ID");

      try {
        const res = await fetch(`/api/users/${userId}/profile`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update profile");

        setProfile(data);
        return { success: true };
      } catch (err: unknown) {
        setError(getErrorMessage(err));
        return { success: false };
      }
    },
    [userId]
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, fetchProfile, updateProfile };
}
