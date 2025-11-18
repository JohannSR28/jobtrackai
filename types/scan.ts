export type ScanInitResponse = {
  success: true;
  scanId: string;
  mailCount: number;
  estimatedCredits: number;
};

export type ScanStartResponse = {
  success: true;
  queued: boolean;
};

export type ScanStopResponse = {
  success: true;
  status: "interrupted";
};

export type ScanStatusResponse = {
  success: true;
  status: string;
  progress: number;
  processed: number;
  total: number;
  jobEmails: number;
  creditsSpent: number;
  stopRequested: boolean;
  lastUpdate: number | null;
};

export type ScanErrorResponse = {
  success: false;
  error: string;
};
