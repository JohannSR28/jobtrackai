// src/app/api/scan/init/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

import { ScanService } from "@/services/scanService";
import { ScanRepository } from "@/repositories/scanRepository";

import { MailConnectionRepository } from "@/repositories/MailConnectionRepository";
import { MailConnectionService } from "@/services/MailConnectionService";

import { GmailProviderClient } from "@/infra/mail/gmail/GmailProviderClient";
import { OutlookProviderClient } from "@/infra/mail/outlook/OutlookProviderClient";

import {
  callWithMailAccess,
  ReauthRequiredError,
} from "@/utils/mail/callWithMailAccess";

import {
  refreshGmailAccessToken,
  refreshOutlookAccessToken,
} from "@/infra/oauth/refresh";

type MailProvider = "gmail" | "outlook";
type Body = { limit?: number; provider?: MailProvider };

// On accepte id OU messageId selon tes clients
type LatestMailLike = { id?: string; messageId?: string };

function clampInt(
  raw: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  const n =
    typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function extractMailId(m: LatestMailLike): string | null {
  if (typeof m.id === "string" && m.id.length > 0) return m.id;
  if (typeof m.messageId === "string" && m.messageId.length > 0)
    return m.messageId;
  return null;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;

  if (error || !user) {
    return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const limit = clampInt(body.limit, 50, 1, 60);

  // MailConnectionService (comme ton pattern mail/latest)
  const connRepo = new MailConnectionRepository(supabase);
  const connService = new MailConnectionService(connRepo, {
    refreshGmail: refreshGmailAccessToken,
    refreshOutlook: refreshOutlookAccessToken,
  });

  // ScanService (batchSize en mémoire, pas en DB)
  const scanRepo = new ScanRepository(supabase);
  const scanService = new ScanService(scanRepo, 10);

  try {
    const result = await callWithMailAccess({
      userId: user.id,
      service: connService,
      call: async ({ provider, accessToken }) => {
        // Optionnel: si tu forces le provider via le front
        if (body.provider && body.provider !== provider) {
          throw new Error("PROVIDER_MISMATCH");
        }

        const client =
          provider === "gmail"
            ? new GmailProviderClient(accessToken)
            : new OutlookProviderClient(accessToken);

        const latest = (await client.getLatestMails(limit)) as LatestMailLike[];

        const ids = latest.map(extractMailId).filter((x): x is string => !!x);

        return await scanService.init(user.id, provider, ids);
      },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (e: unknown) {
    if (e instanceof ReauthRequiredError) {
      return NextResponse.json({ error: "REAUTH_REQUIRED" }, { status: 401 });
    }

    if (e instanceof Error && e.message === "PROVIDER_MISMATCH") {
      return NextResponse.json({ error: "PROVIDER_MISMATCH" }, { status: 400 });
    }

    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
