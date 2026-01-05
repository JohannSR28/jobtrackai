export type MailProvider = "gmail" | "outlook";

export type ScanStatus =
  | "created"
  | "running"
  | "paused"
  | "completed"
  | "canceled"
  | "failed";

export type Scan = {
  id: string;
  userId: string;
  provider: MailProvider;

  status: ScanStatus;

  messageIds: string[] | null; // présent tant que actif
  processedCount: number;
  totalCount: number;

  shouldContinue: boolean;
  errorMessage?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

export type InitResult = { mode: "existing" | "new"; scan: Scan };
export type BatchResult = { scan: Scan };

export interface ScanRepository {
  findActiveScan(userId: string): Promise<Scan | null>;
  getByIdForUser(userId: string, scanId: string): Promise<Scan | null>;

  create(input: {
    userId: string;
    provider: MailProvider;
    status: ScanStatus;
    messageIds: string[] | null;
    processedCount: number;
    totalCount: number;
    shouldContinue: boolean;
  }): Promise<Scan>;

  update(
    userId: string,
    scanId: string,
    patch: Partial<{
      status: ScanStatus;
      messageIds: string[] | null;
      processedCount: number;
      totalCount: number;
      shouldContinue: boolean;
      errorMessage: string | null;
    }>
  ): Promise<Scan>;

  finalize(
    userId: string,
    scanId: string,
    input: {
      finalStatus: "completed" | "canceled" | "failed";
      errorMessage?: string;
    }
  ): Promise<Scan>;
}

function normalizeBatchSize(n: number): number {
  const x = Number.isFinite(n) ? Math.floor(n) : 10;
  return Math.max(1, Math.min(100, x));
}

function isFinal(status: ScanStatus): boolean {
  return status === "completed" || status === "canceled" || status === "failed";
}

export class ScanService {
  constructor(private scans: ScanRepository, private readonly batchSize = 10) {}

  /**
   * init: si scan actif -> existing
   * sinon crée un scan "created" avec messageIds (déjà récupérés par l'endpoint)
   */
  async init(
    userId: string,
    provider: MailProvider,
    messageIds: string[]
  ): Promise<InitResult> {
    const active = await this.scans.findActiveScan(userId);
    if (active) return { mode: "existing", scan: active };

    const totalCount = messageIds.length;
    const shouldContinue = totalCount > 0;

    const created = await this.scans.create({
      userId,
      provider,
      status: "created",
      messageIds,
      processedCount: 0,
      totalCount,
      shouldContinue,
    });

    return { mode: "new", scan: created };
  }

  async runBatch(userId: string, scanId: string): Promise<BatchResult> {
    const scan = await this.mustGetScan(userId, scanId);

    // Déjà final => no-op
    if (isFinal(scan.status)) return { scan };

    // On doit avoir les IDs tant que scan actif
    if (!scan.messageIds) {
      const failed = await this.scans.finalize(userId, scanId, {
        finalStatus: "failed",
        errorMessage: "MISSING_MESSAGE_IDS",
      });
      return { scan: failed };
    }

    // Reprise auto
    if (scan.status === "paused" || scan.status === "created") {
      await this.scans.update(userId, scanId, { status: "running" });
    }

    const running = await this.mustGetScan(userId, scanId);
    if (running.status !== "running") return { scan: running };

    if (!running.messageIds) {
      const failed = await this.scans.finalize(userId, scanId, {
        finalStatus: "failed",
        errorMessage: "MISSING_MESSAGE_IDS",
      });
      return { scan: failed };
    }

    const size = normalizeBatchSize(this.batchSize);
    const start = Math.max(0, running.processedCount);
    const end = Math.min(start + size, running.totalCount);

    const slice = running.messageIds.slice(start, end);

    //  Si plus rien à traiter => on termine en forçant processedCount=totalCount
    if (slice.length === 0) {
      await this.scans.update(userId, scanId, {
        processedCount: running.totalCount,
        shouldContinue: false,
      });
      const finalized = await this.scans.finalize(userId, scanId, {
        finalStatus: "completed",
      });
      return { scan: finalized };
    }

    try {
      // v0: traitement fictif
      for (const _id of slice) {
        console.log("Processing message id:", _id);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      const newProcessed = start + slice.length;
      const done = newProcessed >= running.totalCount;

      //  Si terminé => update processedCount/shouldContinue puis finalize
      if (done) {
        await this.scans.update(userId, scanId, {
          processedCount: running.totalCount,
          shouldContinue: false,
        });

        const completed = await this.scans.finalize(userId, scanId, {
          finalStatus: "completed",
        });

        return { scan: completed };
      }

      // Sinon => batch partiel
      const updated = await this.scans.update(userId, scanId, {
        processedCount: newProcessed,
        shouldContinue: true,
      });

      return { scan: updated };
    } catch (e) {
      const msg = this.stringifyError(e);
      const failed = await this.scans.finalize(userId, scanId, {
        finalStatus: "failed",
        errorMessage: msg,
      });
      return { scan: failed };
    }
  }

  async pause(userId: string, scanId: string): Promise<{ scan: Scan }> {
    const scan = await this.mustGetScan(userId, scanId);
    if (scan.status !== "running") return { scan };
    const updated = await this.scans.update(userId, scanId, {
      status: "paused",
    });
    return { scan: updated };
  }

  async cancel(userId: string, scanId: string): Promise<{ scan: Scan }> {
    const scan = await this.mustGetScan(userId, scanId);
    if (isFinal(scan.status)) return { scan };
    const canceled = await this.scans.finalize(userId, scanId, {
      finalStatus: "canceled",
    });
    return { scan: canceled };
  }

  private async mustGetScan(userId: string, scanId: string): Promise<Scan> {
    const scan = await this.scans.getByIdForUser(userId, scanId);
    if (!scan) throw new Error("SCAN_NOT_FOUND");
    return scan;
  }

  private stringifyError(e: unknown): string {
    if (typeof e === "string") return e;
    if (e instanceof Error) return e.message || "UNKNOWN_ERROR";
    try {
      return JSON.stringify(e);
    } catch {
      return "UNKNOWN_ERROR";
    }
  }
}
