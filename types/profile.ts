// src/types/profile.ts
export interface Profile {
  id: string;
  user_id: string;
  photo_url: string | null;
  last_scan_ts: number | null; // remplacé last_scan_at
  created_at: string;
}
