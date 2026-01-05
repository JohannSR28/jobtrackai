// src/app/api/scan/cancel/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

import { ScanService } from "@/services/scanService";
import { ScanRepository } from "@/repositories/scanRepository";

type Body = { scanId?: string };

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;

  if (error || !user) {
    return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  if (!body.scanId) {
    return NextResponse.json({ error: "MISSING_SCAN_ID" }, { status: 400 });
  }

  try {
    const scanRepo = new ScanRepository(supabase);
    const scanService = new ScanService(scanRepo, 10);

    const { scan } = await scanService.cancel(user.id, body.scanId);
    return NextResponse.json({ scan }, { status: 200 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "SCAN_NOT_FOUND") {
      return NextResponse.json({ error: "SCAN_NOT_FOUND" }, { status: 404 });
    }
    console.error("[POST /api/scan/cancel] failed", e);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
