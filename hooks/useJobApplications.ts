"use client";

import { useState, useCallback } from "react";

// ========================================
// 1. TYPES DU DOMAINE (UI)
// ========================================

export type JobStatus =
  | "applied"
  | "interview"
  | "offer"
  | "rejection"
  | "unknown";
export type JobMailProvider = "gmail" | "outlook" | "unknown";

export type JobApplication = {
  id: string;
  company: string | null;
  position: string | null;
  status: JobStatus;
  notes: string | null;
  archived: boolean;
  last_activity_at: string;
  updated_at: string;

  user_id: string;
  applied_at: string | null;
  created_by: "auto" | "user";
  created_at: string;
};

export type JobEmail = {
  id: string;
  subject: string | null;
  from_text: string | null;
  snippet: string | null;
  received_at: string; // C'est ici que le Drawer lit la date
  status: JobStatus;
  company: string | null;
  position: string | null;
  event_type: string | null;
  application_id: string | null;
  archived: boolean;

  user_id: string;
  provider: JobMailProvider;
  provider_message_id: string;
  body_excerpt: string | null;
  updated_at: string;
};

export type Bucket = {
  app: JobApplication;
  emails: JobEmail[];
};

export type StatusFilter = JobStatus | "all";

export type GetApplicationsResponse = {
  applications: Bucket[];
  total: number;
  page: number;
  maxPage: number;
  statusCounts: Record<StatusFilter, number>;
};

// ========================================
// 2. TYPES DE L'API (DTOs)
// Correction : On accepte camelCase ET snake_case pour matcher le Backend
// ========================================

type ApiApplication = {
  id: string;
  company?: string | null;
  position?: string | null;
  status?: JobStatus;
  notes?: string | null;
  archived?: boolean;

  // Support double format
  last_activity_at?: string;
  lastActivityAt?: string;

  updated_at?: string;
  updatedAt?: string;
};

type ApiEmail = {
  id: string;
  subject?: string | null;

  // Support double format (Backend vs DB)
  from_text?: string | null;
  fromText?: string | null;

  snippet?: string | null;

  received_at?: string;
  receivedAt?: string; // 👈 C'est lui que le backend envoie !

  status?: JobStatus;
  company?: string | null;
  position?: string | null;

  event_type?: string | null;
  eventType?: string | null;

  application_id?: string | null;
  applicationId?: string | null;

  archived?: boolean;
  isArchived?: boolean;

  provider_message_id?: string;
  providerMessageId?: string;
};

type ApiBucket = {
  app: ApiApplication;
  emails: ApiEmail[];
};

type ApiApplicationResponse = {
  applications: ApiBucket[];
  total: number;
  page: number;
  maxPage: number;
  statusCounts: Record<StatusFilter, number>;
};

// ========================================
// 3. HELPER : Mapping Strict (Api -> Domain)
// ========================================

function mapApiToDomain(
  apiResponse: ApiApplicationResponse | null | undefined
): GetApplicationsResponse {
  const emptyResponse: GetApplicationsResponse = {
    applications: [],
    total: 0,
    page: 1,
    maxPage: 1,
    statusCounts: {
      all: 0,
      applied: 0,
      interview: 0,
      offer: 0,
      rejection: 0,
      unknown: 0,
    },
  };

  if (!apiResponse || !Array.isArray(apiResponse.applications)) {
    return emptyResponse;
  }

  const mappedApps: Bucket[] = apiResponse.applications.map((b: ApiBucket) => {
    // Mapping robuste pour l'Application
    const app: JobApplication = {
      id: b.app.id,
      company: b.app.company ?? null,
      position: b.app.position ?? null,
      status: b.app.status ?? "unknown",
      notes: b.app.notes ?? null,
      archived: !!b.app.archived,

      // On cherche d'abord le camelCase, puis le snake_case, puis fallback
      last_activity_at:
        b.app.lastActivityAt ??
        b.app.last_activity_at ??
        new Date().toISOString(),
      updated_at:
        b.app.updatedAt ?? b.app.updated_at ?? new Date().toISOString(),

      // Fillers UI
      user_id: "current-user",
      applied_at: null,
      created_by: "auto",
      created_at: new Date().toISOString(),
    };

    // Mapping robuste pour les Emails
    const emails: JobEmail[] = (b.emails || []).map((e: ApiEmail) => ({
      id: e.id,
      subject: e.subject ?? null,

      // Mapping robuste
      from_text: e.fromText ?? e.from_text ?? null,
      snippet: e.snippet ?? null,

      // 👇 LE FIX EST ICI : On lit receivedAt en priorité
      received_at: e.receivedAt ?? e.received_at ?? new Date().toISOString(),

      status: e.status ?? "unknown",
      company: e.company ?? null,
      position: e.position ?? null,
      event_type: e.eventType ?? e.event_type ?? null,
      application_id: e.applicationId ?? e.application_id ?? app.id,
      archived: !!(e.isArchived ?? e.archived),

      // Fillers UI
      user_id: "current-user",
      provider: "gmail",
      provider_message_id:
        e.providerMessageId ?? e.provider_message_id ?? "unknown",
      body_excerpt: e.snippet ?? null,
      updated_at: new Date().toISOString(),
    }));

    return { app, emails };
  });

  return {
    applications: mappedApps,
    total: apiResponse.total ?? 0,
    page: apiResponse.page ?? 1,
    maxPage: apiResponse.maxPage ?? 1,
    statusCounts: apiResponse.statusCounts ?? emptyResponse.statusCounts,
  };
}

// ========================================
// 4. HOOK
// ========================================

export function useJobApplications() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = (err: unknown) => {
    console.error(err);
    const message =
      err instanceof Error ? err.message : "Une erreur est survenue";
    setError(message);
    throw err;
  };

  const getApplications = useCallback(
    async (params: {
      archived?: boolean;
      status?: StatusFilter;
      page?: number;
      pageSize?: number;
    }): Promise<GetApplicationsResponse> => {
      setLoading(true);
      setError(null);
      try {
        const searchParams = new URLSearchParams();
        if (params.archived !== undefined)
          searchParams.set("archived", String(params.archived));
        if (params.status) searchParams.set("status", params.status);
        if (params.page) searchParams.set("page", String(params.page));
        if (params.pageSize)
          searchParams.set("pageSize", String(params.pageSize));

        const res = await fetch(`/api/applications?${searchParams}`);
        if (!res.ok) throw new Error("Failed to fetch applications");

        const rawData = (await res.json()) as ApiApplicationResponse;

        return mapApiToDomain(rawData);
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Impossible de charger les données");
        return mapApiToDomain(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateApplication = useCallback(
    async (id: string, data: Partial<JobApplication>) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/applications/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to update application");
        return await res.json();
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const archiveApplication = useCallback(
    async (id: string, archived: boolean) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/applications/${id}/archive`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived }),
        });
        if (!res.ok) throw new Error("Failed to archive application");
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteApplication = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete application");
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateEmail = useCallback(
    async (id: string, data: Partial<JobEmail>) => {
      setLoading(true);
      try {
        const body = {
          company: data.company,
          position: data.position,
          status: data.status,
          event_type: data.event_type,
        };

        const res = await fetch(`/api/emails/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to update email");
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    getApplications,
    updateApplication,
    archiveApplication,
    deleteApplication,
    updateEmail,
  };
}
