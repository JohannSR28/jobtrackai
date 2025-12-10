"use client";

import { useCallback, useEffect, useState } from "react";

export interface ApplicationSummary {
  id: string;
  company: string | null;
  role: string | null;
  current_status: string | null;
  last_email_date_ts: number | null;
  last_email_message_id: string | null;
  thread_hint: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobEmailItem {
  id: string;
  message_id: string;
  status: string;
  company: string | null;
  role: string | null;
  email_date_ts: number | null;
  provider: string;
  created_at?: string;
}

export interface ApplicationDetail {
  application: ApplicationSummary;
  emails: JobEmailItem[];
}

interface ApplicationsListResponse {
  applications: ApplicationSummary[];
}

interface ApplicationDetailResponse {
  application: ApplicationSummary;
  emails: JobEmailItem[];
}

export function useApplications() {
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [errorList, setErrorList] = useState<string | null>(null);

  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(null);
  const [selectedDetail, setSelectedDetail] =
    useState<ApplicationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    try {
      setErrorList(null);
      setLoadingList(true);

      const res = await fetch("/api/applications", {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(
          data.error ?? "Erreur lors du chargement des candidatures"
        );
      }

      const data = (await res.json()) as ApplicationsListResponse;
      setApplications(data.applications);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Erreur inconnue lors du chargement des candidatures";
      setErrorList(msg);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const fetchApplicationDetail = useCallback(async (applicationId: string) => {
    try {
      setErrorDetail(null);
      setLoadingDetail(true);

      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(
          data.error ?? "Erreur lors du chargement du détail de la candidature"
        );
      }

      const data = (await res.json()) as ApplicationDetailResponse;
      setSelectedDetail(data);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Erreur inconnue lors du chargement du détail de la candidature";
      setErrorDetail(msg);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const selectApplication = useCallback(
    (applicationId: string) => {
      setSelectedApplicationId(applicationId);
      void fetchApplicationDetail(applicationId);
    },
    [fetchApplicationDetail]
  );

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications]);

  return {
    // liste
    applications,
    loadingList,
    errorList,
    refetchApplications: fetchApplications,

    // sélection / détail
    selectedApplicationId,
    selectedDetail,
    loadingDetail,
    errorDetail,
    selectApplication,
  };
}
