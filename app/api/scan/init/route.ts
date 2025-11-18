// src/app/api/scan/init/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ScanService } from "@/services/scanService";

export async function POST() {
  try {
    // Authentification
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: "Non autorisé." },
        { status: 401 }
      );
    }

    // Init du scan
    const result = await ScanService.initScan(user.id);

    return NextResponse.json({
      ...result, // { scanId, mailCount, estimatedCredits }
    });
  } catch (err) {
    console.error("[API] /scan/init:", err);

    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Erreur interne.",
      },
      { status: 400 }
    );
  }
}
