// app/api/google/status/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { MailConnectionsService } from "@/services/MailConnectionsService";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id)
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const service = new MailConnectionsService(user.id, "gmail");
    const { connected } = await service.checkConnectionStatus();

    return NextResponse.json({ connected });
  } catch (err) {
    console.error("Erreur /api/google/status:", err);
    return NextResponse.json(
      { error: "Impossible de vérifier le statut." },
      { status: 500 }
    );
  }
}
