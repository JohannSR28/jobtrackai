"use client";

import { useState, useCallback } from "react";

// ========================================
// 1. TYPES DU DOMAINE (UI)
// Ce sont les types complets que tes composants (Drawer, etc.) attendent.
// ========================================

export type JobStatus =
  | "applied"
  | "interview"
  | "offer"
  | "rejection"
  | "unknown";
export type JobMailProvider = "gmail" | "outlook" | "unknown";

export type JobApplication = {
  // Champs réels (API + DB)
  id: string;
  company: string | null;
  position: string | null;
  status: JobStatus;
  notes: string | null;
  archived: boolean;
  last_activity_at: string;
  updated_at: string;

  // Champs "Legacy/UI" (valeurs par défaut générées par le frontend)
  user_id: string;
  applied_at: string | null;
  created_by: "auto" | "user";
  created_at: string;
};

export type JobEmail = {
  // Champs réels (API + DB)
  id: string;
  subject: string | null;
  from_text: string | null;
  snippet: string | null;
  received_at: string;
  status: JobStatus;
  company: string | null;
  position: string | null;
  event_type: string | null;
  application_id: string | null;
  archived: boolean;

  // Champs "Legacy/UI"
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
// Ce sont les types partiels que l'API renvoie réellement.
// ========================================

// Structure brute d'une application venant de l'API
type ApiApplication = {
  id: string;
  company?: string | null;
  position?: string | null;
  status?: JobStatus;
  notes?: string | null;
  archived?: boolean;
  last_activity_at?: string;
  updated_at?: string;
};

// Structure brute d'un email venant de l'API
type ApiEmail = {
  id: string;
  subject?: string | null;
  from_text?: string | null;
  snippet?: string | null;
  received_at?: string;
  status?: JobStatus;
  company?: string | null;
  position?: string | null;
  event_type?: string | null;
  application_id?: string | null;
  archived?: boolean;
  provider_message_id?: string;
};

// Structure brute du Bucket venant de l'API
type ApiBucket = {
  app: ApiApplication;
  emails: ApiEmail[];
};

// Réponse globale de l'API
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
  // Valeur par défaut si l'API échoue ou renvoie null
  const emptyResponse: GetApplicationsResponse = {
    applications: [],
    total: 0,
    page: 1,
    maxPage: 1,
    statusCounts: {
      all: 0,
      applied: 0,
      interview: 0,
      rejection: 0,
      offer: 0,
      unknown: 0,
    },
  };

  if (!apiResponse || !Array.isArray(apiResponse.applications)) {
    return emptyResponse;
  }

  const mappedApps: Bucket[] = apiResponse.applications.map((b: ApiBucket) => {
    // Reconstruction de l'Application complète avec valeurs par défaut pour les champs manquants
    const app: JobApplication = {
      id: b.app.id,
      company: b.app.company ?? null, // Utilisation de ?? (Nullish coalescing)
      position: b.app.position ?? null,
      status: b.app.status ?? "unknown",
      notes: b.app.notes ?? null,
      archived: !!b.app.archived,
      last_activity_at: b.app.last_activity_at ?? new Date().toISOString(),
      updated_at: b.app.updated_at ?? new Date().toISOString(),

      // Fillers UI
      user_id: "current-user",
      applied_at: null,
      created_by: "auto",
      created_at: new Date().toISOString(),
    };

    // Reconstruction des Emails
    const emails: JobEmail[] = (b.emails || []).map((e: ApiEmail) => ({
      id: e.id,
      subject: e.subject ?? null,
      from_text: e.from_text ?? null,
      snippet: e.snippet ?? null,
      received_at: e.received_at ?? new Date().toISOString(),
      status: e.status ?? "unknown",
      company: e.company ?? null,
      position: e.position ?? null,
      event_type: e.event_type ?? null,
      application_id: e.application_id ?? app.id,
      archived: !!e.archived,

      // Fillers UI
      user_id: "current-user",
      provider: "gmail",
      provider_message_id: e.provider_message_id ?? "unknown",
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

        // Typage de la réponse brute JSON
        const rawData = (await res.json()) as ApiApplicationResponse;

        return mapApiToDomain(rawData);
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Impossible de charger les données");
        // Retourne une structure vide valide en cas d'erreur réseau
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
        // Construction explicite du body pour ne pas envoyer de champs UI inutiles
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
