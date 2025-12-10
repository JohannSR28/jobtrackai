// ----------------------------
// INIT
// ----------------------------
export type ScanInitSuccess = {
  success: true;
  scanId: string;
  mailCount: number;
  estimatedCredits: number;
};

export type ScanInitError = {
  success: false;
  reason: "NO_MAILS" | "INSUFFICIENT_CREDITS" | string;
};

export type ScanInitResponse = ScanInitSuccess | ScanInitError;

// ----------------------------
// BATCH
// ----------------------------
export type ScanBatchSuccess = {
  success: true;
  status: "running" | "completed";
  processedThisBatch: number;
  remaining: boolean;
};

export type ScanBatchError = {
  success: false;
  reason: "NO_ACTIVE_SCAN" | "ALREADY_FINISHED" | "STOP_REQUESTED" | string;
};

export type ScanBatchResponse = ScanBatchSuccess | ScanBatchError;

// ----------------------------
// STOP
// ----------------------------
export type ScanStopSuccess = {
  success: true;
  status: "interrupted";
};

export type ScanStopError = {
  success: false;
  reason: "NO_ACTIVE_SCAN" | "ALREADY_STOPPED_OR_DONE" | string;
};

export type ScanStopResponse = ScanStopSuccess | ScanStopError;

// ----------------------------
// STATUS
// ----------------------------
export type ScanStatusSuccess = {
  success: true;
  status: ScanLogStatus; // defined below
  progress: number;
  processed: number;
  total: number;
  jobEmails: number;
  creditsSpent: number;
  stopRequested: boolean;
  lastUpdate: number | null;
};

export type ScanStatusError = {
  success: false;
  reason: "NO_SCAN_FOUND" | string;
};

export type ScanStatusResponse = ScanStatusSuccess | ScanStatusError;

// ----------------------------
// DB ScanLog `status` field union
// ----------------------------
export type ScanLogStatus =
  | "pending"
  | "running"
  | "completed"
  | "empty"
  | "error"
  | "interrupted";
