// Endpoint: /api/google/oauth/start
// ------------------------------------------------------
// Ce endpoint démarre l’authentification OAuth Google
// pour obtenir la permission de lire les emails Gmail
// de l'utilisateur (via l'API Gmail).
//
// Il redirige l'utilisateur vers la page de consentement Google
// avec les bons paramètres, dont un redirect_uri.
// Ce redirect_uri est essentiel : après validation Google renvoie
// le "code" ici → /api/google/oauth/callback
// ------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Identifiant OAuth Google stocké dans les variables d’environnement
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;

// Scope = permission demandée (ici : lecture Gmail)
const SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export async function GET(req: NextRequest) {
  // Récupère l'utilisateur connecté via Supabase
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // L'utilisateur doit être connecté pour continuer
  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Détermine l'URL de base du site :
  // - en prod : NEXT_PUBLIC_BASE_URL (Vercel)
  // - en local ou fallback : protocole + domaine du serveur
  const url = new URL(req.url);
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? `${url.protocol}//${url.host}`;

  // URL vers laquelle Google doit renvoyer après le consentement
  const redirectUri = `${baseUrl}/api/google/oauth/callback`;

  // Construire les paramètres exigés par Google OAuth
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code", // Google renvoie un "code" (OAuth code grant)
    access_type: "offline", // permet d'obtenir un refresh_token
    prompt: "consent", // force Google à redemander l'autorisation
    scope: SCOPE, // permission demandée (Gmail readonly)
    login_hint: user.email, // suggère à Google quel compte choisir
  });

  // URL finale pour rediriger l'utilisateur vers Google OAuth
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  // Pour debug : permet de vérifier la valeur exacte du redirect_uri en prod
  console.log("Google OAuth redirect_uri:", redirectUri);

  // Redirection vers Google → l'utilisateur voit la page de consentement
  return NextResponse.redirect(authUrl);
}
