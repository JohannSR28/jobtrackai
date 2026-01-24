"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** ----------------- types ----------------- */

export type JobStatus =
  | "applied"
  | "interview"
  | "rejection"
  | "offer"
  | "unknown";

export const JOB_STATUS: ReadonlyArray<JobStatus> = [
  "applied",
  "interview",
  "rejection",
  "offer",
  "unknown",
] as const;

export type JobApplication = Readonly<{
  id: string;
  userId: string;
  company: string | null;
  position: string | null;
  status: JobStatus;
  appliedAt: string | null;
  lastActivityAt: string;
  notes: string | null;
  archived: boolean;
  createdBy: "auto" | "user";
  createdAt: string;
  updatedAt: string;
}>;

export type JobEmail = Readonly<{
  id: string;
  userId: string;

  provider: "gmail" | "outlook";
  providerMessageId: string;

  receivedAt: string;

  fromText: string | null;
  subject: string | null;
  snippet: string | null;

  company: string | null;
  position: string | null;
  status: JobStatus;
  eventType: string | null;
  confidence: number;

  applicationId: string | null;
  archived: boolean;

  createdAt: string;
  updatedAt: string;
}>;

export type AppWithEmails = Readonly<{
  app: JobApplication;
  emails: JobEmail[];
}>;

/** ----------------- helpers safe (sans any) ----------------- */

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function stringify(v: unknown): string {
  if (typeof v === "string") return v;
  if (v instanceof Error) return v.message;
  try {
    return JSON.stringify(v);
  } catch {
    return "UNKNOWN_ERROR";
  }
}

function isJobStatus(v: unknown): v is JobStatus {
  return JOB_STATUS.includes(v as JobStatus);
}

function normalizeStatus(v: unknown): JobStatus {
  return isJobStatus(v) ? v : "unknown";
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normalizeText(s: string | null | undefined): string | null {
  const v = (s ?? "").trim();
  return v.length ? v : null;
}

function readStr(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function readStrOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function readBool(v: unknown): boolean {
  return typeof v === "boolean" ? v : Boolean(v);
}

function readNum(v: unknown, fallback = 0): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toJobApplication(row: unknown): JobApplication {
  if (!isObj(row)) throw new Error("BAD_APP_ROW");

  return {
    id: readStr(row["id"]),
    userId: readStr(row["user_id"]),
    company: readStrOrNull(row["company"]),
    position: readStrOrNull(row["position"]),
    status: normalizeStatus(row["status"]),
    appliedAt: readStrOrNull(row["applied_at"]),
    lastActivityAt: readStr(row["last_activity_at"]),
    notes: readStrOrNull(row["notes"]),
    archived: readBool(row["archived"]),
    createdBy: row["created_by"] === "user" ? "user" : "auto",
    createdAt: readStr(row["created_at"]),
    updatedAt: readStr(row["updated_at"]),
  };
}

function toJobEmail(row: unknown): JobEmail {
  if (!isObj(row)) throw new Error("BAD_EMAIL_ROW");

  const providerRaw = readStr(row["provider"]);
  const provider: "gmail" | "outlook" =
    providerRaw === "outlook" ? "outlook" : "gmail";

  return {
    id: readStr(row["id"]),
    userId: readStr(row["user_id"]),

    provider,
    providerMessageId: readStr(row["provider_message_id"]),

    receivedAt: readStr(row["received_at"]),

    fromText: readStrOrNull(row["from_text"]),
    subject: readStrOrNull(row["subject"]),
    snippet: readStrOrNull(row["snippet"]),

    company: readStrOrNull(row["company"]),
    position: readStrOrNull(row["position"]),
    status: normalizeStatus(row["status"]),
    eventType: readStrOrNull(row["event_type"]),
    confidence: clamp01(readNum(row["confidence"], 0)),

    applicationId: readStrOrNull(row["application_id"]),
    archived: readBool(row["archived"]),

    createdAt: readStr(row["created_at"]),
    updatedAt: readStr(row["updated_at"]),
  };
}

/** ----------------- hook via endpoints (paged + filters) ----------------- */

type ArchiveMode = "active" | "archived";

type Filters = Readonly<{
  page: number; // 1-based
  pageSize: number; // UI default 20
  status: JobStatus | "all";
  archiveMode: ArchiveMode;
}>;

type Meta = Readonly<{
  page: number;
  pageSize: number;
  totalApps: number;
  totalPages: number;
  status: JobStatus | null; // from API
  archived: boolean;
}>;

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function sanitizeFilters(raw: Filters): Filters {
  return {
    ...raw,
    page: clampInt(raw.page, 1, 10_000),
    pageSize: clampInt(raw.pageSize, 1, 50),
    status: raw.status === "all" ? "all" : normalizeStatus(raw.status),
    archiveMode: raw.archiveMode === "archived" ? "archived" : "active",
  };
}

function filtersEqual(a: Filters, b: Filters): boolean {
  return (
    a.page === b.page &&
    a.pageSize === b.pageSize &&
    a.status === b.status &&
    a.archiveMode === b.archiveMode
  );
}

function buildQuery(filters: Filters): string {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));

  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.archiveMode === "archived") params.set("archived", "1");

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function toMeta(v: unknown, fallback: Filters): Meta {
  if (!isObj(v)) {
    return {
      page: fallback.page,
      pageSize: fallback.pageSize,
      totalApps: 0,
      totalPages: 1,
      status: fallback.status === "all" ? null : fallback.status,
      archived: fallback.archiveMode === "archived",
    };
  }

  const page = clampInt(readNum(v["page"], fallback.page), 1, 10_000);
  const pageSize = clampInt(readNum(v["pageSize"], fallback.pageSize), 1, 50);
  const totalApps = Math.max(
    0,
    clampInt(readNum(v["totalApps"], 0), 0, 1_000_000)
  );
  const totalPages = Math.max(
    1,
    clampInt(readNum(v["totalPages"], 1), 1, 10_000)
  );

  const statusRaw = v["status"];
  const status: JobStatus | null = isJobStatus(statusRaw) ? statusRaw : null;

  const archived = readBool(v["archived"]);

  return { page, pageSize, totalApps, totalPages, status, archived };
}

/** ----------------- tiny debug helpers ----------------- */

const DEBUG = true; // <-- mets false quand c'est réglé

function dbg(...args: unknown[]) {
  if (!DEBUG) return;
  // eslint-disable-next-line no-console
  console.log("[useJobDomainApi]", ...args);
}

function stableDumpFilters(f: Filters) {
  return {
    page: f.page,
    pageSize: f.pageSize,
    status: f.status,
    archiveMode: f.archiveMode,
  };
}

export function useJobDomainApi() {
  /** ---- data state (séparé des filters pour éviter les boucles) ---- */
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  const [apps, setApps] = useState<JobApplication[]>([]);
  const [emails, setEmails] = useState<JobEmail[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);

  /** ---- filters (source de vérité) ---- */
  const [filters, setFilters] = useState<Filters>({
    page: 1,
    pageSize: 20,
    status: "all",
    archiveMode: "active",
  });

  /** ---- refs anti-stale & anti-race ---- */
  const filtersRef = useRef<Filters>(filters);
  useEffect(() => {
    filtersRef.current = filters;
    dbg("filters changed →", stableDumpFilters(filters));
  }, [filters]);

  const pollSeq = useRef(0);

  /**
   * IMPORTANT FIX:
   * - poll() ne doit PAS faire setFilters() quand il est appelé par le useEffect auto.
   * - setFilters() ne doit arriver QUE via setters (setPage/setStatusFilter/...)
   * - exception: si le serveur clamp la page (page > totalPages), on corrige UNE fois.
   */
  const alignOnceRef = useRef(false);

  /** ----------------- setters filters (sans rerender inutile) ----------------- */

  const setStatusFilter = useCallback((status: Filters["status"]) => {
    setFilters((prev) => {
      const next = sanitizeFilters({ ...prev, status, page: 1 });
      if (!filtersEqual(prev, next)) dbg("setStatusFilter", { prev, next });
      return filtersEqual(prev, next) ? prev : next;
    });
  }, []);

  const setArchiveMode = useCallback((archiveMode: ArchiveMode) => {
    setFilters((prev) => {
      const next = sanitizeFilters({ ...prev, archiveMode, page: 1 });
      if (!filtersEqual(prev, next)) dbg("setArchiveMode", { prev, next });
      return filtersEqual(prev, next) ? prev : next;
    });
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => {
      const next = sanitizeFilters({ ...prev, page });
      if (!filtersEqual(prev, next)) dbg("setPage", { prev, next });
      return filtersEqual(prev, next) ? prev : next;
    });
  }, []);

  const nextPage = useCallback(() => {
    setFilters((prev) => {
      const totalPages = meta?.totalPages ?? 10_000;
      const nextPage = clampInt(prev.page + 1, 1, totalPages);
      const next = sanitizeFilters({ ...prev, page: nextPage });
      if (!filtersEqual(prev, next)) dbg("nextPage", { prev, next });
      return filtersEqual(prev, next) ? prev : next;
    });
  }, [meta?.totalPages]);

  const prevPage = useCallback(() => {
    setFilters((prev) => {
      const prevPage = clampInt(prev.page - 1, 1, 10_000);
      const next = sanitizeFilters({ ...prev, page: prevPage });
      if (!filtersEqual(prev, next)) dbg("prevPage", { prev, next });
      return filtersEqual(prev, next) ? prev : next;
    });
  }, []);

  /** ----------------- poll (stable) ----------------- */
  const poll = useCallback(async (override?: Partial<Filters>) => {
    const seq = ++pollSeq.current;

    // base = latest filters at call time
    const base = filtersRef.current;
    const effective = sanitizeFilters({ ...base, ...(override ?? {}) });

    // DEBUG: voir qui appelle poll()
    dbg("poll() called", {
      seq,
      override: override ? { ...override } : null,
      base: stableDumpFilters(base),
      effective: stableDumpFilters(effective),
      stack: new Error().stack, // <- super utile pour trouver la source
    });

    // IMPORTANT: on ne "persiste" les filters que si override existe (action explicite)
    if (override && Object.keys(override).length > 0) {
      setFilters((prev) => {
        const next = effective;
        if (!filtersEqual(prev, next))
          dbg("poll override → setFilters", { prev, next });
        return filtersEqual(prev, next) ? prev : next;
      });
    }

    setLoading(true);
    setErr(null);

    try {
      const qs = buildQuery(effective);

      dbg("fetch →", `/api/job-domain${qs}`);
      const t0 =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const r = await fetch(`/api/job-domain${qs}`, { cache: "no-store" });
      const t1 =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      dbg("fetch done", {
        ms: Math.round(t1 - t0),
        ok: r.ok,
        status: r.status,
      });

      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : `Request failed (${r.status})`
        );
      }

      const data = (await r.json()) as {
        apps?: unknown[];
        emails?: unknown[];
        meta?: unknown;
      };

      const nextApps = (data.apps ?? []).map(toJobApplication);
      const nextEmails = (data.emails ?? []).map(toJobEmail);
      const nextMeta = toMeta(data.meta, effective);

      if (seq !== pollSeq.current) {
        dbg("poll ignored (stale)", { seq, latest: pollSeq.current });
        return;
      }

      setApps(nextApps);
      setEmails(nextEmails);
      setMeta(nextMeta);
      setLoading(false);
      setErr(null);

      // FIX: align filters ONLY if server clamps page (rare), and only once per clamp episode
      const pageClamped = nextMeta.page !== effective.page;
      if (pageClamped) {
        dbg("server clamped page", {
          requested: effective.page,
          got: nextMeta.page,
        });
      }

      if (pageClamped && !alignOnceRef.current) {
        alignOnceRef.current = true;
        setFilters((prev) => {
          const next = sanitizeFilters({ ...prev, page: nextMeta.page });
          if (!filtersEqual(prev, next))
            dbg("align page once → setFilters", { prev, next });
          return filtersEqual(prev, next) ? prev : next;
        });
      }

      // reset alignOnceRef when stable again
      if (!pageClamped) alignOnceRef.current = false;
    } catch (e: unknown) {
      if (seq !== pollSeq.current) return;
      setLoading(false);
      setErr(stringify(e));
      dbg("poll error", e);
    }
  }, []);

  /** ----------------- auto poll on filters change ----------------- */
  useEffect(() => {
    // extra debug: comprendre la fréquence
    dbg("useEffect auto poll triggered", stableDumpFilters(filters));
    void poll();
  }, [
    filters.page,
    filters.pageSize,
    filters.status,
    filters.archiveMode,
    poll,
  ]);

  /** ----------------- derived appsWithEmails ----------------- */
  const appsWithEmails: AppWithEmails[] = useMemo(() => {
    const byApp = new Map<string, JobEmail[]>();

    for (const em of emails) {
      const key = em.applicationId ?? "__unassigned__";
      const arr = byApp.get(key) ?? [];
      arr.push(em);
      byApp.set(key, arr);
    }

    const out: AppWithEmails[] = apps.map((app) => ({
      app,
      emails: byApp.get(app.id) ?? [],
    }));

    const unassigned = byApp.get("__unassigned__") ?? [];
    if (unassigned.length) {
      out.push({
        app: {
          id: "__unassigned__",
          userId: apps[0]?.userId ?? "",
          company: "Unassigned",
          position: null,
          status: "unknown",
          appliedAt: null,
          lastActivityAt: new Date().toISOString(),
          notes: null,
          archived: false,
          createdBy: "auto",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        emails: unassigned,
      });
    }

    return out;
  }, [apps, emails]);

  /** ----------------- actions ----------------- */

  const moveEmail = useCallback(
    async (jobEmailId: string, targetApplicationId: string | null) => {
      setErr(null);

      const normalizedTarget: string | null =
        targetApplicationId === "__unassigned__" ? null : targetApplicationId;

      try {
        const r = await fetch("/api/job-emails/move", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            jobEmailId,
            targetApplicationId: normalizedTarget,
          }),
        });

        if (!r.ok) {
          const data = (await r.json().catch(() => ({}))) as {
            error?: unknown;
          };
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : `Request failed (${r.status})`
          );
        }

        setEmails((prev) =>
          prev.map((e) =>
            e.id === jobEmailId ? { ...e, applicationId: normalizedTarget } : e
          )
        );
      } catch (e: unknown) {
        setErr(stringify(e));
      }
    },
    []
  );

  const updateEmail = useCallback(
    async (input: {
      jobEmailId: string;
      company: string | null;
      position: string | null;
      status: JobStatus;
      eventType: string | null;
    }) => {
      setErr(null);

      try {
        if (!isJobStatus(input.status)) throw new Error("INVALID_STATUS");

        const nextCompany = normalizeText(input.company);
        const nextPosition = normalizeText(input.position);
        const nextEventType = normalizeText(input.eventType);

        const r = await fetch("/api/job-emails/update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            jobEmailId: input.jobEmailId,
            company: nextCompany,
            position: nextPosition,
            status: input.status,
            eventType: nextEventType,
          }),
        });

        if (!r.ok) {
          const data = (await r.json().catch(() => ({}))) as {
            error?: unknown;
          };
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : `Request failed (${r.status})`
          );
        }

        setEmails((prev) =>
          prev.map((e) =>
            e.id === input.jobEmailId
              ? {
                  ...e,
                  company: nextCompany,
                  position: nextPosition,
                  status: input.status,
                  eventType: nextEventType,
                }
              : e
          )
        );
      } catch (e: unknown) {
        setErr(stringify(e));
      }
    },
    []
  );

  const deleteEmail = useCallback(async (jobEmailId: string) => {
    setErr(null);

    try {
      const r = await fetch("/api/job-emails/delete", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ jobEmailId }),
      });

      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : `Request failed (${r.status})`
        );
      }

      setEmails((prev) => prev.filter((e) => e.id !== jobEmailId));
    } catch (e: unknown) {
      setErr(stringify(e));
    }
  }, []);

  const archiveEmail = useCallback(
    async (input: { jobEmailId: string; archived: boolean }) => {
      setErr(null);

      try {
        const r = await fetch("/api/job-emails/archive", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            jobEmailId: input.jobEmailId,
            archived: input.archived,
          }),
        });

        if (!r.ok) {
          const data = (await r.json().catch(() => ({}))) as {
            error?: unknown;
          };
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : `Request failed (${r.status})`
          );
        }

        setEmails((prev) => {
          const viewingArchived = filtersRef.current.archiveMode === "archived";
          const shouldHide =
            (!viewingArchived && input.archived) ||
            (viewingArchived && !input.archived);

          if (shouldHide) return prev.filter((e) => e.id !== input.jobEmailId);

          return prev.map((e) =>
            e.id === input.jobEmailId ? { ...e, archived: input.archived } : e
          );
        });
      } catch (e: unknown) {
        setErr(stringify(e));
      }
    },
    []
  );

  const deleteApplication = useCallback(async (applicationId: string) => {
    setErr(null);

    try {
      const r = await fetch("/api/job-applications/delete", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ applicationId }),
      });

      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : `Request failed (${r.status})`
        );
      }

      setApps((prev) => prev.filter((a) => a.id !== applicationId));
      setEmails((prev) =>
        prev.filter((e) => e.applicationId !== applicationId)
      );
    } catch (e: unknown) {
      setErr(stringify(e));
    }
  }, []);

  const archiveApplication = useCallback(
    async (input: { applicationId: string; archived: boolean }) => {
      setErr(null);

      try {
        const r = await fetch("/api/job-applications/archive", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            applicationId: input.applicationId,
            archived: input.archived,
          }),
        });

        if (!r.ok) {
          const data = (await r.json().catch(() => ({}))) as {
            error?: unknown;
          };
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : `Request failed (${r.status})`
          );
        }

        setApps((prev) => {
          const viewingArchived = filtersRef.current.archiveMode === "archived";
          const shouldHide =
            (!viewingArchived && input.archived) ||
            (viewingArchived && !input.archived);

          if (shouldHide)
            return prev.filter((a) => a.id !== input.applicationId);

          return prev.map((a) =>
            a.id === input.applicationId
              ? { ...a, archived: input.archived }
              : a
          );
        });

        setEmails((prev) => {
          const viewingArchived = filtersRef.current.archiveMode === "archived";
          const shouldHide =
            (!viewingArchived && input.archived) ||
            (viewingArchived && !input.archived);

          if (shouldHide)
            return prev.filter((e) => e.applicationId !== input.applicationId);
          return prev;
        });
      } catch (e: unknown) {
        setErr(stringify(e));
      }
    },
    []
  );

  const updateApplication = useCallback(
    async (input: {
      applicationId: string;
      company: string | null;
      position: string | null;
      status: JobStatus;
      notes: string | null;
    }) => {
      setErr(null);

      if (!isJobStatus(input.status)) {
        setErr("INVALID_STATUS");
        return;
      }

      const nextCompany = normalizeText(input.company);
      const nextPosition = normalizeText(input.position);
      const nextNotes = normalizeText(input.notes);

      let snapshot: JobApplication[] | null = null;
      setApps((prev) => {
        snapshot = prev;
        return prev.map((a) =>
          a.id === input.applicationId
            ? {
                ...a,
                company: nextCompany,
                position: nextPosition,
                status: input.status,
                notes: nextNotes,
              }
            : a
        );
      });

      try {
        const r = await fetch("/api/job-applications/update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            applicationId: input.applicationId,
            company: nextCompany,
            position: nextPosition,
            status: input.status,
            notes: nextNotes,
          }),
        });

        if (!r.ok) {
          const data = (await r.json().catch(() => ({}))) as {
            error?: unknown;
          };
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : `Request failed (${r.status})`
          );
        }
      } catch (e: unknown) {
        if (snapshot) setApps(snapshot);
        setErr(stringify(e));
      }
    },
    []
  );

  return {
    /** data */
    loading,
    err,
    apps,
    emails,
    appsWithEmails,

    /** pagination + filters */
    page: filters.page,
    pageSize: filters.pageSize,
    statusFilter: filters.status,
    archiveMode: filters.archiveMode,
    meta,

    setPage,
    nextPage,
    prevPage,
    setStatusFilter,
    setArchiveMode,

    /** refresh */
    poll,

    /** email actions */
    moveEmail,
    updateEmail,
    deleteEmail,
    archiveEmail,

    /** app actions */
    updateApplication,
    deleteApplication,
    archiveApplication,
  };
}
