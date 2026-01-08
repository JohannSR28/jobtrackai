export type ScanRangeRules = {
  maxDays: number; // 90
  maxMessages: number; // 2000
};

export type ValidateRangeResult =
  | {
      ok: true;
      start: string;
      end: string;
      days: number;
      count: number; // exact (0..2000)
      ids: string[]; // exact (count items)
    }
  | {
      ok: false;
      reason: "RANGE_TOO_LARGE" | "TOO_MANY_MESSAGES" | "INVALID_RANGE";
      details?: string;
      start?: string;
      end?: string;
      days?: number;
      count?: number; // ex: 2001 => signifie "> 2000"
    };
