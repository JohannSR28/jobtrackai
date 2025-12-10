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

    // 1) Récupérer les derniers message IDs Gmail
    const messageIds = await ScanService.getRecentMessageIdsForUser(
      user.id,
      "gmail",
      50 // tu peux mettre 50, 100, 200, etc.
    );

    return NextResponse.json({ messageIds });
  } catch (err: unknown) {
    console.error("[API] /api/scan/prepare error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
