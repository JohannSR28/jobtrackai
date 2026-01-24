// services/jobDomain/types.ts
export type JobMailProvider = "gmail" | "outlook";

export type JobStatus =
  | "applied"
  | "interview"
  | "rejection"
  | "offer"
  | "unknown";

export type JobEmail = Readonly<{
  id: string;
  userId: string;

  provider: JobMailProvider;
  providerMessageId: string;

  receivedAt: string; // ISO

  fromText: string | null;
  subject: string | null;
  snippet: string | null;

  company: string | null;
  position: string | null;
  status: JobStatus;
  eventType: string | null;
  confidence: number;

  applicationId: string | null;
  isArchived: boolean;

  createdAt: string;
  updatedAt: string;
}>;

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
