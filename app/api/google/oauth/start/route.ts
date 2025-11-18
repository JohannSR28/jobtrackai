import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_BASE_URL}/api/google/oauth/callback`;
const SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

/**
 * Démarre le flux OAuth Google pour lecture Gmail.
 * Redirige l’utilisateur vers la page de consentement Google.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: SCOPE,
    login_hint: user.email, // force le bon compte Google
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
