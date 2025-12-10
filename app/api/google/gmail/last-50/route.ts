// app/api/google/gmail/last-50/route.ts
import { NextResponse } from "next/server";
import { getAuthenticatedGmailClient } from "@/utils/getAuthenticatedGmailService";

export async function GET() {
  try {
    // 1) Auth + client Gmail
    const { gmail } = await getAuthenticatedGmailClient();

    // 2) Liste des 50 derniers IDs (inbox par défaut)
    const ids = await gmail.listMessages(50, "in:inbox");

    // 3) Récupérer le contenu de chaque message
    const messages = await Promise.all(ids.map((id) => gmail.getMessage(id)));

    // 4) Réponse JSON
    return NextResponse.json({ messages });
  } catch (err) {
    console.error("Erreur dans /api/google/gmail/last-50:", err);

    const message =
      err instanceof Error ? err.message : "Erreur interne du serveur.";

    const status = message.includes("Non autorisé") ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
