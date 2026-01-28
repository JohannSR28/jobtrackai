// src/app/api/mail/callback/[provider]/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { MailConnectionRepository } from "@/repositories/MailConnectionRepository";

type Provider = "gmail" | "outlook";
export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ provider: string }> }
) {
  const { provider: providerRaw } = await ctx.params;
  const provider = parseProvider(providerRaw);
  if (!provider)
    return jsonError(400, "Invalid provider in path (gmail|outlook)");

  const url = new URL(req.url);

  // (Optionnel mais utile pour debug)
  const oauthError = url.searchParams.get("error");
  if (oauthError) return jsonError(400, `OAuth error: ${oauthError}`);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return jsonError(400, "Missing code/state");

  const cookieStore = await cookies();

  // 1) Vérif state (anti CSRF)
  const okState = verifyAndConsumeState(cookieStore, state);
  if (!okState) return jsonError(400, "Invalid OAuth state");

  // 1bis) Récupère l'email attendu (défini dans /connect) + consume
  const expectedEmail = consumeExpectedEmail(cookieStore);
  if (!expectedEmail) {
    return jsonError(400, "Missing expected email. Restart /api/mail/connect.");
  }

  // 2) User doit être loggé dans l'app (Supabase)
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;
  if (error || !user || !user.email) return jsonError(401, "Not authenticated");

  // Enforce: l'email supabase doit matcher l'email attendu
  if (!sameEmail(user.email, expectedEmail)) {
    return jsonError(403, `Email mismatch. Expected: ${expectedEmail}`);
  }

  // 3) Exchange code -> tokens
  const tokens = await exchangeCodeForTokens(provider, code);
  if (!tokens.refresh_token) {
    return jsonError(
      400,
      "No refresh_token returned. Reconnect (Google: prompt=consent)."
    );
  }

  // 4) Email retourné par provider
  const oauthEmail = await getEmail(
    provider,
    tokens.access_token,
    tokens.id_token
  );

  // Enforce: l'email provider doit matcher l'email Supabase (et donc attendu)
  if (!sameEmail(oauthEmail, user.email)) {
    return jsonError(
      403,
      `Email mismatch. You are logged in as ${user.email} but authorized ${oauthEmail}`
    );
  }

  // 5) Save DB
  const repo = new MailConnectionRepository(supabase);
  await repo.save({
    userId: user.id,
    provider,
    email: oauthEmail,
    refreshToken: tokens.refresh_token,
  });

  // 6) Redirect UI
  return NextResponse.redirect(new URL("/dashboard", url.origin));
}

/** ----------------- helpers ----------------- */

function parseProvider(raw: string): Provider | null {
  return raw === "gmail" || raw === "outlook" ? raw : null;
}

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

function verifyAndConsumeState(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  receivedState: string
): boolean {
  const cookieState = cookieStore.get("mail_oauth_state")?.value;
  if (!cookieState || cookieState !== receivedState) return false;

  cookieStore.set("mail_oauth_state", "", { maxAge: 0, path: "/" });
  return true;
}

// Lit puis supprime le cookie "expected email"
function consumeExpectedEmail(
  cookieStore: Awaited<ReturnType<typeof cookies>>
): string | null {
  const v = cookieStore.get("mail_oauth_expected_email")?.value ?? null;
  cookieStore.set("mail_oauth_expected_email", "", { maxAge: 0, path: "/" });
  return v;
}

// Compare emails de façon safe
function sameEmail(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

type TokenExchangeResult = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
};

async function exchangeCodeForTokens(
  provider: Provider,
  code: string
): Promise<TokenExchangeResult> {
  return provider === "gmail"
    ? exchangeGoogleCode(code)
    : exchangeMicrosoftCode(code);
}

async function exchangeGoogleCode(code: string): Promise<TokenExchangeResult> {
  const client_id = process.env.GOOGLE_MAIL_CLIENT_ID!;
  const client_secret = process.env.GOOGLE_MAIL_CLIENT_SECRET!;
  const redirect_uri = process.env.GOOGLE_MAIL_REDIRECT_URI!;
  if (!client_id || !client_secret || !redirect_uri) {
    throw new Error("Missing GOOGLE mail env vars");
  }

  const body = new URLSearchParams({
    client_id,
    client_secret,
    redirect_uri,
    grant_type: "authorization_code",
    code,
  });

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!r.ok) throw new Error(`Google token exchange failed: ${await r.text()}`);
  return (await r.json()) as TokenExchangeResult;
}

async function exchangeMicrosoftCode(
  code: string
): Promise<TokenExchangeResult> {
  const client_id = process.env.MS_MAIL_CLIENT_ID!;
  const client_secret = process.env.MS_MAIL_CLIENT_SECRET!;
  const redirect_uri = process.env.MS_MAIL_REDIRECT_URI!;
  if (!client_id || !client_secret || !redirect_uri) {
    throw new Error("Missing Microsoft mail env vars");
  }

  const body = new URLSearchParams({
    client_id,
    client_secret,
    redirect_uri,
    grant_type: "authorization_code",
    code,
    scope: ["offline_access", "User.Read", "Mail.Read"].join(" "),
  });

  const r = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  if (!r.ok)
    throw new Error(`Microsoft token exchange failed: ${await r.text()}`);
  return (await r.json()) as TokenExchangeResult;
}

async function getEmail(
  provider: Provider,
  accessToken: string,
  idToken?: string
): Promise<string> {
  const jwtEmail = idToken ? tryGetEmailFromJwt(idToken, provider) : null;
  if (jwtEmail) return jwtEmail;

  return provider === "gmail"
    ? await googleUserinfoEmail(accessToken)
    : await microsoftMeEmail(accessToken);
}

function tryGetEmailFromJwt(
  idToken: string,
  provider: Provider
): string | null {
  try {
    const [, payload] = idToken.split(".");
    if (!payload) return null;

    const json = Buffer.from(payload, "base64url").toString("utf-8");
    const data: unknown = JSON.parse(json);
    if (!isRecord(data)) return null;

    if (provider === "gmail") {
      const email = data["email"];
      return typeof email === "string" ? email : null;
    }

    const preferred = data["preferred_username"];
    const upn = data["upn"];
    if (typeof preferred === "string") return preferred;
    if (typeof upn === "string") return upn;

    return null;
  } catch {
    return null;
  }
}

async function googleUserinfoEmail(accessToken: string): Promise<string> {
  const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error(`Google userinfo failed: ${await r.text()}`);

  const u: unknown = await r.json();
  if (!isRecord(u) || typeof u["email"] !== "string") {
    throw new Error("Google userinfo: missing email");
  }
  return u["email"];
}

async function microsoftMeEmail(accessToken: string): Promise<string> {
  const r = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error(`Microsoft /me failed: ${await r.text()}`);

  const me: unknown = await r.json();
  if (!isRecord(me)) throw new Error("Microsoft /me: invalid response");

  const mail = me["mail"];
  const upn = me["userPrincipalName"];
  if (typeof mail === "string" && mail.length > 0) return mail;
  if (typeof upn === "string" && upn.length > 0) return upn;

  throw new Error("Microsoft /me: missing email");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
