import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

import type { InitInput } from "@/services/scanService";
import { buildScanService } from "@/app/api/scan/_shared/buildScanService";
import { ReauthRequiredError } from "@/utils/mail/callWithMailAccess";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function isString(v: unknown): v is string {
  return typeof v === "string";
}

function parseInitInput(raw: unknown): InitInput {
  if (!isRecord(raw)) return { mode: "since_last" };

  const mode = raw["mode"];
  if (mode === "custom") {
    const startIso = raw["startIso"];
    const endIso = raw["endIso"];
    return {
      mode: "custom",
      startIso: isString(startIso) ? startIso : String(startIso ?? ""),
      endIso: isString(endIso) ? endIso : String(endIso ?? ""),
    };
  }

  const endIso = raw["endIso"];
  return isString(endIso)
    ? { mode: "since_last", endIso }
    : { mode: "since_last" };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;

  if (error || !user) {
    return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
  }

  const bodyRaw = (await req.json().catch(() => ({}))) as unknown;
  const input = parseInitInput(bodyRaw);

  try {
    const { scanService, provider } = await buildScanService(supabase, user.id);
    const result = await scanService.init(user.id, provider, input);
    return NextResponse.json(result, { status: 200 });
  } catch (e: unknown) {
    if (e instanceof ReauthRequiredError) {
      return NextResponse.json({ error: "REAUTH_REQUIRED" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "MAIL_PROVIDER_NOT_CONNECTED") {
      return NextResponse.json(
        { error: "MAIL_NOT_CONNECTED" },
        { status: 400 }
      );
    }
    const msg = e instanceof Error ? e.message : "UNKNOWN_ERROR";
    return NextResponse.json(
      { error: "INTERNAL_ERROR", details: msg },
      { status: 500 }
    );
  }
}
