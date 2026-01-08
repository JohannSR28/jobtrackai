import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

import { buildScanService } from "@/app/api/scan/_shared/buildScanService";
import { ReauthRequiredError } from "@/utils/mail/callWithMailAccess";

type Body = { scanId?: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function isString(v: unknown): v is string {
  return typeof v === "string";
}
function parseBody(raw: unknown): Body {
  if (!isRecord(raw)) return {};
  const scanId = raw["scanId"];
  return isString(scanId) ? { scanId } : {};
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;

  if (error || !user) {
    return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
  }

  const raw = (await req.json().catch(() => ({}))) as unknown;
  const body = parseBody(raw);

  if (!body.scanId) {
    return NextResponse.json({ error: "MISSING_SCAN_ID" }, { status: 400 });
  }

  try {
    const { scanService } = await buildScanService(supabase, user.id);
    const { scan } = await scanService.pause(user.id, body.scanId);
    return NextResponse.json({ scan }, { status: 200 });
  } catch (e: unknown) {
    if (e instanceof ReauthRequiredError) {
      return NextResponse.json({ error: "REAUTH_REQUIRED" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "SCAN_NOT_FOUND") {
      return NextResponse.json({ error: "SCAN_NOT_FOUND" }, { status: 404 });
    }

    const msg = e instanceof Error ? e.message : "UNKNOWN_ERROR";
    return NextResponse.json(
      { error: "INTERNAL_ERROR", details: msg },
      { status: 500 }
    );
  }
}
