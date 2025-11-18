import { NextResponse } from "next/server";
import { getAuthenticatedGmailService } from "@/utils/getAuthenticatedGmailService";
/**
 * Récupère les e-mails entre deux dates via Gmail API.
 * Exemple: GET /api/google/gmail/date-range?start=2025-01-01&end=2025-01-05
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");

    // ⚠️ Validation des paramètres
    if (!start || !end) {
      return NextResponse.json(
        { error: "Les paramètres 'start' et 'end' sont requis." },
        { status: 400 }
      );
    }

    // 1. Récupère un access token valide via ton service
    const { gmail } = await getAuthenticatedGmailService();

    // 2. Appel de la Gmail API via ton service dédié
    const emails = await gmail.listEmailsByDateRange(start, end);

    //  3. Réponse JSON structurée
    return NextResponse.json({ emails });
  } catch (err) {
    console.error(" Erreur dans /api/google/gmail/date-range:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Erreur interne du serveur.",
      },
      { status: 500 }
    );
  }
}
