import { GmailMessageExtractor } from "./mail-traitement-services/gmailMessageExtractor";

export interface GmailHeader {
  name: string;
  value: string;
}
interface GmailMessageMetadata {
  id: string;
  internalDate: string | number;
}

export interface GmailClient {
  listEmailIdsByDateRange(
    start: number | string | bigint,
    end: number | string | bigint
  ): Promise<string[]>;

  fetchMessageById(id: string): Promise<GmailMessage>;

  fetchEmailsByIds(ids: string[]): Promise<GmailMessage[]>;

  listEmailsByDateRange(
    start: number | string | bigint,
    end: number | string | bigint
  ): Promise<GmailMessage[]>;
}

interface GmailListResponse {
  messages?: { id: string }[];
  nextPageToken?: string;
}

interface GmailMessageResponse {
  id: string;
  payload?: {
    headers?: GmailHeader[];
    body?: { data?: string };
    parts?: GmailPart[];
    mimeType?: string;
  };
}

interface GmailPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
}

export interface GmailMessage {
  id: string;
  subject: string;
  from: string;
  content: string;
  dateTs?: number; // utile pour stocker la date d’envoi
}

export class GmailApiService {
  private readonly API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
  private readonly MAX_EMAILS = 3000;
  private readonly BATCH_SIZE = 20;
  private readonly DELAY_MS = 250;

  constructor(private readonly accessToken: string) {}

  /** Appel générique vers Gmail API */
  private async fetchGmail<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gmail API error (${res.status}): ${text}`);
    }
    return res.json() as Promise<T>;
  }

  /** Convertit string, number, bigint → timestamp UNIX (secondes) */
  private toUnix(date: string | number | bigint): number {
    if (typeof date === "bigint") return Number(date) / 1000;
    if (typeof date === "number") return Math.floor(date / 1000);
    return Math.floor(new Date(date).getTime() / 1000);
  }

  // ────────────────────────────────────────────────
  // 1️  IDs uniquement
  // ────────────────────────────────────────────────
  async listEmailIdsByDateRange(
    startDate: string | number | bigint,
    endDate: string | number | bigint
  ): Promise<string[]> {
    const afterUnix = this.toUnix(startDate);
    const beforeUnix = this.toUnix(endDate);
    const query = `after:${afterUnix} before:${beforeUnix} in:inbox`;

    let nextPageToken: string | undefined;
    let allIds: string[] = [];

    console.log(`[GmailApiService] ➤ Récupération des IDs (${query})`);

    do {
      const url = `${this.API_BASE}/messages?q=${encodeURIComponent(
        query
      )}&maxResults=500${nextPageToken ? `&pageToken=${nextPageToken}` : ""}`;

      const res = await this.fetchGmail<GmailListResponse>(url);
      const pageIds = res.messages?.map((m) => m.id) ?? [];
      allIds.push(...pageIds);

      console.log(
        `[GmailApiService] Page: ${pageIds.length} IDs récupérés (${allIds.length} cumulés)`
      );

      nextPageToken = res.nextPageToken;
      if (!nextPageToken || allIds.length >= this.MAX_EMAILS) break;
    } while (true);

    allIds = allIds.slice(0, this.MAX_EMAILS);
    console.log(`[GmailApiService] Total final: ${allIds.length} IDs`);
    // NEW: fetch metadata for chronological sorting
    const meta = await this.fetchMetadataBulk(allIds);

    // sort oldest → newest
    meta.sort((a, b) => a.internalDate - b.internalDate);

    // return ids sorted
    return meta.map((m) => m.id);
  }

  // ────────────────────────────────────────────────
  // 2️  Un e-mail à la fois
  // ────────────────────────────────────────────────
  async fetchMessageById(id: string): Promise<GmailMessage> {
    try {
      const detail = await this.fetchGmail<GmailMessageResponse>(
        `${this.API_BASE}/messages/${id}?format=full`
      );

      const headers = detail.payload?.headers ?? [];
      const subject =
        headers.find((h) => h.name === "Subject")?.value || "(Sans objet)";
      const from =
        headers.find((h) => h.name === "From")?.value || "(Expéditeur inconnu)";
      const dateHeader = headers.find((h) => h.name === "Date")?.value;
      const dateTs = dateHeader ? new Date(dateHeader).getTime() : Date.now();

      const content = GmailMessageExtractor.extractBody(detail.payload);

      return { id, subject, from, content, dateTs };
    } catch (err) {
      console.error(`[GmailApiService] Erreur message ${id}:`, err);
      return {
        id,
        subject: "(Erreur de lecture)",
        from: "(Inconnu)",
        content: "",
        dateTs: Date.now(),
      };
    }
  }

  // ────────────────────────────────────────────────
  // 3️  Plusieurs e-mails à la fois
  // ────────────────────────────────────────────────
  async fetchEmailsByIds(ids: string[]): Promise<GmailMessage[]> {
    const emails: GmailMessage[] = [];

    console.log(`[GmailApiService] ➤ Téléchargement du contenu complet`);

    for (let i = 0; i < ids.length; i += this.BATCH_SIZE) {
      const batch = ids.slice(i, i + this.BATCH_SIZE);
      const results = await Promise.all(
        batch.map((id) => this.fetchMessageById(id))
      );
      emails.push(...results);

      console.log(
        `[GmailApiService] Batch ${i / this.BATCH_SIZE + 1} traité (${
          emails.length
        } cumulés)`
      );

      await new Promise((r) => setTimeout(r, this.DELAY_MS));
    }

    console.log(`[GmailApiService] Tous les e-mails téléchargés`);
    return emails;
  }

  // ────────────────────────────────────────────────
  // 4️  Shortcut complet (IDs + contenus)
  // ────────────────────────────────────────────────
  async listEmailsByDateRange(
    startDate: string | number | bigint,
    endDate: string | number | bigint
  ): Promise<GmailMessage[]> {
    const ids = await this.listEmailIdsByDateRange(startDate, endDate);
    return await this.fetchEmailsByIds(ids);
  }

  // ────────────────────────────────────────────────
  // 5️  Récupération metadata en bulk pour tri chronologique
  // ────────────────────────────────────────────────
  private async fetchMetadataBulk(
    ids: string[]
  ): Promise<{ id: string; internalDate: number }[]> {
    const results: { id: string; internalDate: number }[] = [];

    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);

      const batchResults = await Promise.all(
        batch.map(async (id) => {
          const detail = await this.fetchGmail<GmailMessageMetadata>(
            `${this.API_BASE}/messages/${id}?format=metadata&metadataHeaders=Date`
          );

          const internalDate = Number(detail.internalDate) || Date.now();

          return { id, internalDate };
        })
      );

      results.push(...batchResults);

      await new Promise((r) => setTimeout(r, this.DELAY_MS)); // rate limit Gmail
    }

    return results;
  }
}
