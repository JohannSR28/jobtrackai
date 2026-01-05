// src/app/api/mail/latest/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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

/**
 * GET /api/mail/latest?limit=5
 * Retourne les 5 derniers mails (gmail/outlook), en utilisant:
 * - MailConnectionService (tokens)
 * - ProviderClient (API)
 * - callWithMailAccess (retry 401 -> refresh -> retry)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = clampInt(url.searchParams.get("limit"), 5, 1, 20);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;

  if (error || !user) {
    return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
  }

  // Repo + Service (tu as déjà la classe Service)
  const repo = new MailConnectionRepository(supabase);

  const service = new MailConnectionService(repo, {
    refreshGmail: refreshGmailAccessToken,
    refreshOutlook: refreshOutlookAccessToken,
  });

  try {
    const mails = await callWithMailAccess({
      userId: user.id,
      service,
      call: async ({ provider, accessToken }) => {
        const client =
          provider === "gmail"
            ? new GmailProviderClient(accessToken)
            : new OutlookProviderClient(accessToken);

        return await client.getLatestMails(limit);
      },
    });

    return NextResponse.json({ mails }, { status: 200 });
  } catch (e: unknown) {
    if (e instanceof ReauthRequiredError) {
      return NextResponse.json({ error: "REAUTH_REQUIRED" }, { status: 401 });
    }

    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/** ----------------- helpers ----------------- */

function clampInt(
  raw: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}
