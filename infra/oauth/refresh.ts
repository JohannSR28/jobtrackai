// src/infra/oauth/refresh.ts

type TokenRefreshResponse = { access_token?: string };

export async function refreshGmailAccessToken(
  refreshToken: string
): Promise<string> {
  const client_id = process.env.GOOGLE_MAIL_CLIENT_ID!;
  const client_secret = process.env.GOOGLE_MAIL_CLIENT_SECRET!;
  if (!client_id || !client_secret)
    throw new Error("Missing GOOGLE mail env vars");

  const body = new URLSearchParams({
    client_id,
    client_secret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!r.ok) throw new Error(`Google refresh failed: ${await r.text()}`);

  const data = (await r.json()) as TokenRefreshResponse;
  if (!data.access_token)
    throw new Error("Google refresh: missing access_token");
  return data.access_token;
}

export async function refreshOutlookAccessToken(
  refreshToken: string
): Promise<string> {
  const client_id = process.env.MS_MAIL_CLIENT_ID!;
  const client_secret = process.env.MS_MAIL_CLIENT_SECRET!;
  const redirect_uri = process.env.MS_MAIL_REDIRECT_URI!;
  if (!client_id || !client_secret || !redirect_uri) {
    throw new Error("Missing Microsoft mail env vars");
  }

  const body = new URLSearchParams({
    client_id,
    client_secret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    redirect_uri,
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

  if (!r.ok) throw new Error(`Microsoft refresh failed: ${await r.text()}`);

  const data = (await r.json()) as TokenRefreshResponse;
  if (!data.access_token)
    throw new Error("Microsoft refresh: missing access_token");
  return data.access_token;
}
