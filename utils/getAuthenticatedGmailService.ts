// src/utils/getAuthenticatedGmailService.ts
import { createClient } from "@/utils/supabase/server";
import { MailConnectionsService } from "@/services/MailConnectionsService";
import { GmailApiService } from "@/services/gmailApiService";

/**
 * getAuthenticatedGmailService
 * ───────────────────────────────────────────
 * Centralise l’authentification utilisateur + Gmail.
 * Retourne : { gmail, userId }
 *
 * Utilisation :
 *   const { gmail, userId } = await getAuthenticatedGmailService();
 *   const ids = await gmail.listEmailIdsByDateRange(start, end);
 */
export async function getAuthenticatedGmailService(): Promise<{
  gmail: GmailApiService;
  userId: string;
}> {
  // 1️ Authentification Supabase (serveur)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    throw new Error("Non autorisé. Veuillez vous reconnecter.");
  }

  // 2️ Récupération du token Gmail via ton service de connexion
  const mailConnections = new MailConnectionsService(user.id, "gmail");

  let accessToken: string;
  try {
    accessToken = await mailConnections.getValidAccessToken();
  } catch (err) {
    console.error(
      "[getAuthenticatedGmailService] Impossible d'obtenir un token Gmail:",
      err
    );
    throw new Error(
      "Votre connexion Gmail a expiré. Veuillez reconnecter votre compte pour continuer."
    );
  }

  // 3️ Création du service Gmail prêt à l’emploi
  const gmail = new GmailApiService(accessToken);

  return { gmail, userId: user.id };
}
