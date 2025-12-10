// aiMapper.ts (ou dans le même fichier sous le prompt)

import type { JobEmailAnalysis, JobEmailStatus } from "@/types/aiTypes";

interface RawJobEmailResponse {
  company?: string;
  role?: string;
  status?: JobEmailStatus;
  confidence_company?: number;
  confidence_role?: number;
  confidence_status?: number;
}

/**
 * Transforme l'objet JSON brut renvoyé par le modèle
 * en JobEmailAnalysis propre et typé.
 */
export function mapRawToJobEmailAnalysis(raw: unknown): JobEmailAnalysis {
  if (!raw || typeof raw !== "object") {
    return {
      isJobEmail: false,
      company: null,
      role: null,
      status: "manual",
      confidence: {
        company: 0,
        role: 0,
        status: 0,
      },
    };
  }

  const data = raw as RawJobEmailResponse;

  // Si l'objet est vide → pas un mail de job
  if (Object.keys(data).length === 0) {
    return {
      isJobEmail: false,
      company: null,
      role: null,
      status: "manual",
      confidence: {
        company: 0,
        role: 0,
        status: 0,
      },
    };
  }

  return {
    isJobEmail: true,
    company: data.company ?? null,
    role: data.role ?? null,
    status: data.status ?? "applied",
    confidence: {
      company: data.confidence_company ?? null,
      role: data.confidence_role ?? null,
      status: data.confidence_status ?? null,
    },
  };
}
