// app/api/scan/prepare-v2/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ScanService } from "@/services/scanService";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { scanLogId, messageIds, periodStartTs, periodEndTs } =
      await ScanService.prepareScanForUserV2(user.id, "gmail", 5000);

    return NextResponse.json({
      scanLogId,
      messageIds,
      periodStartTs,
      periodEndTs,
    });
  } catch (err: unknown) {
    console.error("[API] /api/scan/prepare-v2 error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
