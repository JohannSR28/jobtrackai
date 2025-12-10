// app/api/scan/batch/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ScanService } from "@/services/scanService";
import type { MailProvider } from "@/services/MailConnectionsService";

interface BatchRequestBody {
  provider: MailProvider;
  messageIds: string[];
  scanLogId?: string | null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BatchRequestBody;

    if (
      !body ||
      !Array.isArray(body.messageIds) ||
      body.messageIds.length === 0
    ) {
      return NextResponse.json(
        { error: "messageIds[] is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const result = await ScanService.scanBatchForUser({
      userId: user.id,
      provider: body.provider,
      messageIds: body.messageIds,
      scanLogId: body.scanLogId,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("[API] /api/scan/batch error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal error",
      },
      { status: 400 }
    );
  }
}
