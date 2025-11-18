// app/api/google/revoke/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { MailConnectionsService } from "@/services/MailConnectionsService";

export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id)
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const service = new MailConnectionsService(user.id, "gmail");
    await service.revokeConnection();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur /api/google/revoke:", err);
    return NextResponse.json(
      { error: "Impossible de révoquer la connexion." },
      { status: 500 }
    );
  }
}
