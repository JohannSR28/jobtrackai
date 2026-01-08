// infra/mail/gmail/GmailProviderClient.ts
import type { RawMail } from "@/services/ai/mailAnalysis";
import type { ScanRangeRules, ValidateRangeResult } from "@/infra/mail/types";

// ---- types internes gmail ----
type GmailHeader = Readonly<{ name: string; value: string }>;

type GmailMessagePart = Readonly<{
  mimeType?: string;
  filename?: string;
  body?: { data?: string; size?: number };
  parts?: GmailMessagePart[];
}>;

type GmailMessageFull = Readonly<{
  id: string;
  snippet?: string;
  payload?: {
    headers?: GmailHeader[];
    mimeType?: string;
    body?: { data?: string };
    parts?: GmailMessagePart[];
  };
}>;

export type SimpleMail = {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
};

export class GmailProviderClient {
  constructor(private accessToken: string) {}

  async getLatestMails(limit = 5): Promise<SimpleMail[]> {
    const ids = await this.listLatestMessageIds(limit);
    const mails = await Promise.all(
      ids.map((id) => this.getMessageSummary(id))
    );
    return mails;
  }

  private async listLatestMessageIds(limit: number): Promise<string[]> {
    const url = new URL(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages"
    );
    url.searchParams.set("maxResults", String(limit));

    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!r.ok) throw new Error(`Gmail list messages failed: ${await r.text()}`);

    const data = (await r.json()) as { messages?: Array<{ id: string }> };
    return (data.messages ?? []).map((m) => m.id);
  }

  private async getMessageSummary(messageId: string): Promise<SimpleMail> {
    const url = new URL(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`
    );
    url.searchParams.set("format", "metadata");
    url.searchParams.set("metadataHeaders", "From");
    url.searchParams.append("metadataHeaders", "Subject");
    url.searchParams.append("metadataHeaders", "Date");

    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!r.ok) throw new Error(`Gmail get message failed: ${await r.text()}`);

    const data = (await r.json()) as {
      id: string;
      snippet?: string;
      payload?: { headers?: Array<{ name: string; value: string }> };
    };

    const headers = data.payload?.headers ?? [];
    const from = getHeader(headers, "From");
    const subject = getHeader(headers, "Subject");
    const date = getHeader(headers, "Date");

    return {
      id: data.id,
      from,
      subject,
      date,
      snippet: data.snippet ?? "",
    };
  }

  // validate
  async validateRange(
    startIso: string,
    endIso: string,
    rules: ScanRangeRules
  ): Promise<ValidateRangeResult> {
    const norm = normalizeIsoRange(startIso, endIso);
    if (!norm.ok) {
      return { ok: false, reason: "INVALID_RANGE", details: norm.error };
    }

    const { start, end, days } = norm;
    if (days > rules.maxDays) {
      return { ok: false, reason: "RANGE_TOO_LARGE", start, end, days };
    }

    // IMPORTANT: on collecte les IDs pendant la validation
    // - si <= 2000 => on renvoie ids + count exact
    // - si > 2000 => on stop dès 2001 et on renvoie invalid
    const collected = await this.collectIdsUpTo(
      start,
      end,
      rules.maxMessages + 1
    );

    if (collected.length > rules.maxMessages) {
      return {
        ok: false,
        reason: "TOO_MANY_MESSAGES",
        start,
        end,
        days,
        count: rules.maxMessages + 1, // 2001 => indique "> 2000"
      };
    }

    return {
      ok: true,
      start,
      end,
      days,
      count: collected.length,
      ids: collected, // EXACT
    };
  }

  // 2) Endpoint ids: on veut récupérer TOUS les ids (<=2000) sans pagination front
  async getAllMessageIdsInRange(input: {
    startIso: string;
    endIso: string;
    maxMessages: number; // typiquement 2000
  }): Promise<
    { ok: true; ids: string[] } | { ok: false; reason: "TOO_MANY_MESSAGES" }
  > {
    const collected = await this.collectIdsUpTo(
      input.startIso,
      input.endIso,
      input.maxMessages + 1
    );

    if (collected.length > input.maxMessages) {
      return { ok: false, reason: "TOO_MANY_MESSAGES" };
    }

    return { ok: true, ids: collected };
  }

  // --- helpers internals ---
  // 1 page Gmail (pagination interne)
  private async listMessageIdsPage(input: {
    startIso: string;
    endIso: string;
    pageSize: number; // 500 max
    pageToken?: string | null; // Gmail pageToken
  }): Promise<{ ids: string[]; nextToken: string | null }> {
    const pageSize = clampInt(input.pageSize, 500, 1, 500);

    const url = new URL(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages"
    );
    url.searchParams.set("maxResults", String(pageSize));

    const after = Math.floor(new Date(input.startIso).getTime() / 1000);
    const before = Math.floor(new Date(input.endIso).getTime() / 1000);
    url.searchParams.set("q", `after:${after} before:${before}`);

    if (input.pageToken) url.searchParams.set("pageToken", input.pageToken);

    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!r.ok) throw new Error(`Gmail list messages failed: ${await r.text()}`);

    const data = (await r.json()) as {
      messages?: Array<{ id: string }>;
      nextPageToken?: string;
    };

    return {
      ids: (data.messages ?? []).map((m) => m.id),
      nextToken: data.nextPageToken ?? null,
    };
  }

  // collect = boucle serveur jusqu'à "limit" (ex 2001) ou fin
  private async collectIdsUpTo(
    startIso: string,
    endIso: string,
    limit: number
  ): Promise<string[]> {
    const out: string[] = [];
    let token: string | null = null;

    while (out.length < limit) {
      const page = await this.listMessageIdsPage({
        startIso,
        endIso,
        pageSize: 500,
        pageToken: token,
      });

      if (page.ids.length === 0) break;

      // push en respectant la limite
      for (const id of page.ids) {
        out.push(id);
        if (out.length >= limit) break;
      }

      token = page.nextToken;
      if (!token) break;
    }

    return out;
  }

  async getRawMailById(messageId: string, maxChars = 2500): Promise<RawMail> {
    const url = new URL(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`
    );
    url.searchParams.set("format", "full");

    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!r.ok)
      throw new Error(`Gmail get full message failed: ${await r.text()}`);

    const data: GmailMessageFull = await r.json();

    const headers = data.payload?.headers ?? [];
    const from = getHeader(
      headers as Array<{ name: string; value: string }>,
      "From"
    );
    const subject = getHeader(
      headers as Array<{ name: string; value: string }>,
      "Subject"
    );
    const date = getHeader(
      headers as Array<{ name: string; value: string }>,
      "Date"
    );

    const rawBody = extractBestBodyText(data.payload);
    const textBody =
      rawBody.includes("<html") || rawBody.includes("</")
        ? stripHtmlToText(rawBody)
        : rawBody;

    return {
      id: data.id,
      from: from || null,
      subject: subject || null,
      date: new Date(date || Date.now()).toISOString(),
      snippet: data.snippet ?? null,
      body: takeChars(textBody.trim(), maxChars) || null,
      headers: headers.map((h) => ({ name: h.name, value: h.value })),
    };
  }
}

function clampInt(
  raw: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function normalizeIsoRange(
  startIso: string,
  endIso: string
):
  | { ok: true; start: string; end: string; days: number }
  | { ok: false; error: string } {
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime()))
    return { ok: false, error: "INVALID_DATE" };
  if (e <= s) return { ok: false, error: "END_BEFORE_START" };

  const start = s.toISOString();
  const end = e.toISOString();
  const days = Math.ceil((e.getTime() - s.getTime()) / (24 * 3600 * 1000));
  return { ok: true, start, end, days };
}

function getHeader(
  headers: Array<{ name: string; value: string }>,
  name: string
): string {
  const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

function base64UrlDecodeToUtf8(data: string): string {
  // Gmail: base64url
  const padded =
    data.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((data.length + 3) % 4);
  const bytes = Buffer.from(padded, "base64");
  return bytes.toString("utf-8");
}

function extractBestBodyText(payload: GmailMessageFull["payload"]): string {
  if (!payload) return "";

  // 1) simple body.data
  if (payload.body?.data) {
    return base64UrlDecodeToUtf8(payload.body.data);
  }

  // 2) sinon cherche dans parts: prefer text/plain, fallback text/html
  const parts = payload.parts ?? [];
  let html: string | null = null;

  const stack: GmailMessagePart[] = [...parts];
  while (stack.length > 0) {
    const p = stack.pop()!;
    if (p.parts) stack.push(...p.parts);

    const mt = p.mimeType ?? "";
    const data = p.body?.data;
    if (!data) continue;

    if (mt.startsWith("text/plain")) {
      return base64UrlDecodeToUtf8(data);
    }
    if (mt.startsWith("text/html") && html === null) {
      html = base64UrlDecodeToUtf8(data);
    }
  }

  return html ?? "";
}

function stripHtmlToText(input: string): string {
  // simple et safe (pas parfait, mais OK MVP)
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function takeChars(s: string, maxChars: number): string {
  return s.length <= maxChars ? s : s.slice(0, maxChars);
}
