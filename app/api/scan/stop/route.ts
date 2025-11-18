// src/app/api/scan/stop/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ScanLogsRepository } from "@/repositories/ScanLogsRepository";
import { ScanService } from "@/services/scanService";

export async function POST() {
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

    // ➜ On retrouve automatiquement le scan actif
    const running = await ScanLogsRepository.findRunningByUser(user.id);
    if (!running) {
      return NextResponse.json({
        success: false,
        error: "Aucun scan actif à stopper.",
      });
    }

    const result = await ScanService.stopScan(user.id);

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Erreur interne",
      },
      { status: 400 }
    );
  }
}
