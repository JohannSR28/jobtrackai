// src/utils/getAuthenticatedGmailClient.ts
import { createClient } from "@/utils/supabase/server";
import { MailConnectionsService } from "@/services/MailConnectionsService";
import { GmailClient } from "@/services/gmailClient";

export async function getAuthenticatedGmailClient(): Promise<{
  gmail: GmailClient;
  userId: string;
}> {
  // 1) Auth Next + Supabase
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    throw new Error("Non autorisé. Veuillez vous reconnecter.");
  }

  // 2) Récupérer un access_token Gmail via MailConnectionsService
  const mailConnections = new MailConnectionsService(user.id, "gmail");

  let accessToken: string;
  try {
    accessToken = await mailConnections.getValidAccessToken();
  } catch (err) {
    console.error(
      "[getAuthenticatedGmailClient] Impossible d'obtenir un token Gmail:",
      err
    );
    throw new Error(
      "Votre connexion Gmail a expiré. Veuillez reconnecter votre compte pour continuer."
    );
  }

  // 3) Créer le client Gmail prêt à l’emploi
  const gmail = new GmailClient(accessToken);

  return { gmail, userId: user.id };
}
