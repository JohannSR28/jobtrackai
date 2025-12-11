import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? `${url.protocol}//${url.host}`;

  const redirectUri = `${baseUrl}/api/google/oauth/callback`;

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: SCOPE,
    login_hint: user.email,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  // (Optionnel) pour debug : log dans Vercel
  console.log("Google OAuth redirect_uri:", redirectUri);

  return NextResponse.redirect(authUrl);
}
