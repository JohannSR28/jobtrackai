// infra/mail/outlook/OutlookProviderClient.ts

import type { ScanRangeRules, ValidateRangeResult } from "@/infra/mail/types";
import type { RawMail } from "@/services/ai/mailAnalysis";

export type SimpleMail = {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
};

export class OutlookProviderClient {
  constructor(private accessToken: string) {}

  async getLatestMails(limit = 5): Promise<SimpleMail[]> {
    const url = new URL("https://graph.microsoft.com/v1.0/me/messages");
    url.searchParams.set("$top", String(limit));
    url.searchParams.set(
      "$select",
      "id,subject,receivedDateTime,bodyPreview,from"
    );
    url.searchParams.set("$orderby", "receivedDateTime desc");

    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!r.ok)
      throw new Error(`Outlook list messages failed: ${await r.text()}`);

    const data = (await r.json()) as {
      value?: Array<{
        id: string;
        subject?: string;
        receivedDateTime?: string;
        bodyPreview?: string;
        from?: { emailAddress?: { address?: string; name?: string } };
      }>;
    };

    return (data.value ?? []).map((m) => ({
      id: m.id,
      from: formatOutlookFrom(m.from),
      subject: m.subject ?? "",
      date: m.receivedDateTime ?? "",
      snippet: m.bodyPreview ?? "",
    }));
  }

  // (1) Validation: range <= 90j puis collecte ids exact si <=2000,
  // stop à 2001 sinon
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
        count: rules.maxMessages + 1, // 2001 => ">2000"
      };
    }

    return {
      ok: true,
      start,
      end,
      days,
      count: collected.length,
      ids: collected,
    };
  }

  // (2) Retourne tous les ids (<=2000) sans pagination front
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

  private async listIdsPage(input: {
    startIso: string;
    endIso: string;
    pageSize: number; // Graph: $top max ~ 1000 mais restons safe (200/500)
    nextLink?: string | null; // @odata.nextLink
  }): Promise<{ ids: string[]; nextLink: string | null }> {
    const url = input.nextLink
      ? new URL(input.nextLink)
      : buildInitialUrl(input.startIso, input.endIso, input.pageSize);

    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!r.ok)
      throw new Error(`Outlook list messages failed: ${await r.text()}`);

    const data = (await r.json()) as {
      value?: Array<{ id: string }>;
      "@odata.nextLink"?: string;
    };

    return {
      ids: (data.value ?? []).map((m) => m.id),
      nextLink: data["@odata.nextLink"] ?? null,
    };
  }

  private async collectIdsUpTo(
    startIso: string,
    endIso: string,
    limit: number // ex: 2001
  ): Promise<string[]> {
    const out: string[] = [];
    let nextLink: string | null = null;

    while (out.length < limit) {
      const page = await this.listIdsPage({
        startIso,
        endIso,
        pageSize: 500,
        nextLink,
      });

      if (page.ids.length === 0) break;

      for (const id of page.ids) {
        out.push(id);
        if (out.length >= limit) break;
      }

      nextLink = page.nextLink;
      if (!nextLink) break;
    }

    return out;
  }

  async getRawMailById(messageId: string, maxChars = 2500): Promise<RawMail> {
    const url = new URL(
      `https://graph.microsoft.com/v1.0/me/messages/${messageId}`
    );
    url.searchParams.set(
      "$select",
      "id,subject,receivedDateTime,bodyPreview,from,body"
    );

    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!r.ok)
      throw new Error(`Outlook get full message failed: ${await r.text()}`);

    const data: OutlookMessageFull = await r.json();

    const from = formatOutlookFrom(data.from);
    const subject = data.subject ?? "";
    const dateIso = data.receivedDateTime
      ? new Date(data.receivedDateTime).toISOString()
      : new Date().toISOString();

    const bodyContent = data.body?.content ?? "";
    const bodyText =
      (data.body?.contentType ?? "text") === "html"
        ? stripHtmlToText(bodyContent)
        : bodyContent;

    return {
      id: data.id,
      from: from || null,
      subject: subject || null,
      date: dateIso,
      snippet: data.bodyPreview ?? null,
      body: takeChars(bodyText.trim(), maxChars) || null,
      headers: [], // Graph ne renvoie pas les headers ici; OK pour MVP
    };
  }
}

function buildInitialUrl(
  startIso: string,
  endIso: string,
  pageSize: number
): URL {
  const top = clampInt(pageSize, 500, 1, 500);

  const url = new URL("https://graph.microsoft.com/v1.0/me/messages");
  url.searchParams.set("$select", "id,receivedDateTime");
  url.searchParams.set("$top", String(top));

  // filtre date
  url.searchParams.set(
    "$filter",
    `receivedDateTime ge ${startIso} and receivedDateTime lt ${endIso}`
  );

  // ordre asc pour scan séquentiel
  url.searchParams.set("$orderby", "receivedDateTime asc");
  return url;
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

function formatOutlookFrom(
  from: { emailAddress?: { address?: string; name?: string } } | undefined
): string {
  const name = from?.emailAddress?.name ?? "";
  const addr = from?.emailAddress?.address ?? "";
  if (name && addr) return `${name} <${addr}>`;
  return addr || name || "";
}

type OutlookMessageFull = Readonly<{
  id: string;
  subject?: string;
  receivedDateTime?: string;
  bodyPreview?: string;
  from?: { emailAddress?: { address?: string; name?: string } };
  body?: { contentType?: "text" | "html"; content?: string };
}>;

function stripHtmlToText(input: string): string {
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");
}

function takeChars(s: string, maxChars: number): string {
  return s.length <= maxChars ? s : s.slice(0, maxChars);
}
