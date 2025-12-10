// aiTypes.ts (par ex.)

export type JobEmailStatus =
  | "applied"
  | "in_review"
  | "interview"
  | "offer"
  | "rejected"
  | "manual";

export interface TokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

/**
 * Ce que le reste de ton domaine a besoin de savoir sur l'e-mail.
 */
export interface JobEmailAnalysis {
  isJobEmail: boolean;
  company: string | null;
  role: string | null;
  status: JobEmailStatus;
  confidence?: {
    company?: number | null;
    role?: number | null;
    status?: number | null;
  };
}

/**
 * Infos techniques pour logs / coût / debug.
 */
export interface JobEmailAnalysisMeta {
  model: string;
  requestId: string;
  tokenUsage: TokenUsage;
}

/**
 * Résultat complet retourné par le service d'IA.
 */
export interface AnalyzeMailResult {
  analysis: JobEmailAnalysis;
  meta: JobEmailAnalysisMeta;
}
