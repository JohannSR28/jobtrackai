// src/app/api/scan/start/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { scanQueue } from "@/workers/scanWorkers";
import { ScanLogsRepository } from "@/repositories/ScanLogsRepository";

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

    // ➜ Trouve automatiquement le scan actif
    const running = await ScanLogsRepository.findRunningByUser(user.id);
    if (!running) {
      throw new Error("Aucun scan actif à démarrer.");
    }

    // ➜ Planifie le premier batch
    await scanQueue.add("scan-batch", { userId: user.id });

    return NextResponse.json({
      success: true,
      queued: true,
      scanId: running.id,
    });
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
