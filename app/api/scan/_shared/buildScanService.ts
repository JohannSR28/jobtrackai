// src/app/api/scan/_shared/buildScanService.ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { ScanService } from "@/services/scanService";
import type {
  MailProvider,
  MailProviderApi,
  ScanRangeRules,
} from "@/services/scanService";

import { ScanRepository } from "@/repositories/scanRepository";
import { MailCheckpointRepository } from "@/repositories/MailCheckpointRepository";

import { MailConnectionRepository } from "@/repositories/MailConnectionRepository";
import { MailConnectionService } from "@/services/MailConnectionService";

import { GmailProviderClient } from "@/infra/mail/gmail/GmailProviderClient";
import { OutlookProviderClient } from "@/infra/mail/outlook/OutlookProviderClient";

import { callWithMailAccess } from "@/utils/mail/callWithMailAccess";
import {
  refreshGmailAccessToken,
  refreshOutlookAccessToken,
} from "@/infra/oauth/refresh";

// import pour Analyse Ai
import { OpenAIClient } from "@/infra/ai/openAIClient";
import { MailAnalysisService } from "@/services/ai/mailAnalysis";
import { MailReaderService } from "@/services/ai/mailReaderService";

// Ajout imports JobIngestion
import { JobIngestionService } from "@/services/jobDomain/JobIngestionService";
import { JobEmailRepository } from "@/repositories/jobEmailRepository";
import { JobApplicationRepository } from "@/repositories/jobApplicationRepository";

import { TransactionRepository } from "@/repositories/TransactionRepository";

type MailConnectionRow = { provider: MailProvider };

async function getConnectedProvider(
  db: SupabaseClient,
  userId: string
): Promise<MailProvider> {
  const { data, error } = await db
    .from("mail_connections")
    .select("provider")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  const provider = (data as MailConnectionRow | null)?.provider;
  if (provider !== "gmail" && provider !== "outlook") {
    throw new Error("MAIL_PROVIDER_NOT_CONNECTED");
  }
  return provider;
}

export async function buildScanService(
  db: SupabaseClient,
  userId: string
): Promise<{
  scanService: ScanService;
  provider: MailProvider;
}> {
  // =========================
  // 1) Connexion mail (tokens)
  // =========================
  const connRepo = new MailConnectionRepository(db);
  const connService = new MailConnectionService(connRepo, {
    refreshGmail: refreshGmailAccessToken,
    refreshOutlook: refreshOutlookAccessToken,
  });

  // =========================
  // 2) Repos scan + checkpoint
  // =========================
  const scanRepo = new ScanRepository(db);
  const checkpointRepo = new MailCheckpointRepository(db);

  // =========================
  // 3) Règles globales
  // =========================
  const rules: ScanRangeRules = { maxDays: 90, maxMessages: 2000 };

  // =========================
  // 4) Provider API (Gmail/Outlook)
  // =========================
  const providerApi: MailProviderApi = {
    validateRange: async (startIso, endIso, rulesArg) => {
      return await callWithMailAccess({
        userId,
        service: connService,
        call: async ({ provider, accessToken }) => {
          const client =
            provider === "gmail"
              ? new GmailProviderClient(accessToken)
              : new OutlookProviderClient(accessToken);

          return await client.validateRange(startIso, endIso, rulesArg);
        },
      });
    },

    getAllMessageIdsInRange: async ({ startIso, endIso, maxMessages }) => {
      return await callWithMailAccess({
        userId,
        service: connService,
        call: async ({ provider, accessToken }) => {
          const client =
            provider === "gmail"
              ? new GmailProviderClient(accessToken)
              : new OutlookProviderClient(accessToken);

          return await client.getAllMessageIdsInRange({
            startIso,
            endIso,
            maxMessages,
          });
        },
      });
    },
  };

  // =========================
  // 5) 🔑 OPENAI + AI SERVICE
  // =========================
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  const openAIClient = new OpenAIClient(apiKey);
  const mailAnalysisService = new MailAnalysisService(openAIClient);

  // =========================
  // 6) MailReader (getRawMailById)
  // =========================
  const mailReaderService = new MailReaderService(db);

  // =========================
  // 7) Repos job domain
  // =========================

  const jobEmailRepo = new JobEmailRepository(db);
  const jobAppRepo = new JobApplicationRepository(db);
  const jobIngestion = new JobIngestionService(jobEmailRepo, jobAppRepo);

  // =========================
  // 8) Repo Transaction
  // =========================

  const transactionRepo = new TransactionRepository(db);

  // =========================
  // 9) ScanService (FINAL)
  // =========================
  const scanService = new ScanService(
    scanRepo,
    checkpointRepo,
    providerApi,
    mailReaderService,
    mailAnalysisService,
    jobIngestion,
    transactionRepo,

    {
      rules,
      batchHours: 24,
      sinceLastFallbackDays: 7,
    }
  );

  // =========================
  // 9) Provider connecté
  // =========================
  const provider = await getConnectedProvider(db, userId);

  return { scanService, provider };
}
