// src/app/api/scan/status/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ScanService } from "@/services/scanService";
import { ScanLogsRepository } from "@/repositories/ScanLogsRepository";

export async function GET() {
  try {
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

    // ➜ Trouver automatiquement le scan actif
    const running = await ScanLogsRepository.findRunningByUser(user.id);

    if (!running) {
      // Aucun scan actif → front doit afficher : "rien en cours"
      return NextResponse.json({
        success: true,
        status: "none",
        progress: 0,
        processed: 0,
        total: 0,
        jobEmails: 0,
        creditsSpent: 0,
        stopRequested: false,
        lastUpdate: null,
      });
    }

    const result = await ScanService.getStatus(user.id);

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Erreur interne.",
      },
      { status: 400 }
    );
  }
}
