import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
type Provider = "gmail" | "outlook";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const provider = parseProvider(url.searchParams.get("provider"));
  if (!provider) return jsonError(400, "Invalid provider. Use gmail|outlook");

  // 1) User doit être loggé dans ton app
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;

  if (error || !user || !user.email) {
    return jsonError(401, "Not authenticated");
  }

  const cookieStore = await cookies();

  // 2) Anti-CSRF state
  const state = generateState();
  setOauthStateCookie(cookieStore, state);

  // 3) Stocke l'email attendu (pour le callback)
  setExpectedEmailCookie(cookieStore, user.email);

  // 4) Build authorize URL avec login_hint
  const authUrl = buildAuthorizeUrl(provider, state, user.email);
  return NextResponse.redirect(authUrl);
}

/** ----------------- helpers ----------------- */

function parseProvider(raw: string | null): Provider | null {
  return raw === "gmail" || raw === "outlook" ? raw : null;
}

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

function generateState(len = 32): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < len; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function setOauthStateCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  state: string
) {
  cookieStore.set("mail_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
}

function setExpectedEmailCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  email: string
) {
  cookieStore.set("mail_oauth_expected_email", email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
}

function buildAuthorizeUrl(
  provider: Provider,
  state: string,
  expectedEmail: string
): string {
  const cfg = getProviderConfig(provider);

  const base: Record<string, string> = {
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    state,
    scope: cfg.scopes.join(" "),
    // Hint UI côté provider (ne garantit pas à 100%, mais aide)
    login_hint: expectedEmail,
  };

  const params =
    provider === "gmail"
      ? new URLSearchParams({
          ...base,
          access_type: "offline",
          prompt: "consent",
        })
      : new URLSearchParams({
          ...base,
          response_mode: "query",
          prompt: "consent",
        });

  return `${cfg.authorizeUrl}?${params.toString()}`;
}

function getProviderConfig(provider: Provider) {
  if (provider === "gmail") {
    const clientId = process.env.GOOGLE_MAIL_CLIENT_ID!;
    const redirectUri = process.env.GOOGLE_MAIL_REDIRECT_URI!;
    if (!clientId || !redirectUri)
      throw new Error("Missing GOOGLE mail env vars");

    return {
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      clientId,
      redirectUri,
      scopes: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/gmail.readonly",
      ],
    };
  }

  const clientId = process.env.MS_MAIL_CLIENT_ID!;
  const redirectUri = process.env.MS_MAIL_REDIRECT_URI!;
  if (!clientId || !redirectUri)
    throw new Error("Missing Microsoft mail env vars");

  return {
    authorizeUrl:
      "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    clientId,
    redirectUri,
    scopes: ["offline_access", "User.Read", "Mail.Read"],
  };
}
