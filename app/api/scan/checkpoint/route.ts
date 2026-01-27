import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { MailCheckpointRepository } from "@/repositories/MailCheckpointRepository";

export async function GET() {
  const supabase = await createClient();

  // 1. Récupérer l'user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Instancier le repo
  const checkpoints = new MailCheckpointRepository(supabase);

  try {
    // 3. Récupérer le checkpoint (supposons "gmail" par défaut pour l'instant)
    const checkpoint = await checkpoints.get(user.id, "gmail");

    return NextResponse.json({
      lastSuccessAt: checkpoint?.lastSuccessAt ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
