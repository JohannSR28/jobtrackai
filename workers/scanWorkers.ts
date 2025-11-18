// src/workers/scanWorker.ts
import { ScanService } from "@/services/scanService";
import { ScanLogsRepository } from "@/repositories/ScanLogsRepository";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

// Upstash Redis (ou n'importe quel Redis compatible)
const redis = new IORedis(process.env.UPSTASH_REDIS_URL!);

// La queue : ne contient plus scanId, seulement userId
export const scanQueue = new Queue("scan-jobs", {
  connection: redis,
});

// Worker BullMQ
const worker = new Worker(
  "scan-jobs",
  async (job) => {
    const { userId } = job.data;

    // 1️ Chercher le scan actif
    const runningScan = await ScanLogsRepository.findRunningByUser(userId);

    if (!runningScan) {
      console.warn("[ScanWorker] Aucun scan actif pour user", userId);
      return { success: false, reason: "NO_ACTIVE_SCAN" };
    }

    const scanId = runningScan.id;

    // 2️ Vérifier si stop demandé
    if (runningScan.stop_requested) {
      console.log("[ScanWorker] Stop demandé, interruption du scan", scanId);

      await ScanLogsRepository.update(scanId, {
        status: "interrupted",
        last_update_at: Date.now(),
      });
      return { success: true, status: "interrupted" };
    }

    // 3️ Exécuter UN batch
    const res = await ScanService.batchScan(userId);

    console.log(`[ScanWorker] Batch done for ${scanId}`, res);

    // 4️ Replanification si nécessaire
    if (res.success === true && "remaining" in res && res.remaining) {
      console.log(`[ScanWorker] Remaining work → nouvelle tâche`, scanId);

      await scanQueue.add("scan-batch", { userId });
    }

    // 5️ Retourner le résultat (BullMQ va le log)
    return res;
  },
  { connection: redis }
);

// Callbacks de debug
worker.on("completed", (job, res) => {
  console.log(`[✔️ Completed Job ${job.id}]`, res);
});

worker.on("failed", (job, err) => {
  console.error(`[❌ Failed Job ${job?.id}]`, err);
});
