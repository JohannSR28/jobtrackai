import { GmailMessageExtractor } from "./mail-traitement-services/gmailMessageExtractor";

export interface GmailHeader {
  name: string;
  value: string;
}

interface GmailListResponse {
  messages?: { id: string; threadId?: string }[];
  nextPageToken?: string;
}

interface GmailMessageResponse {
  id: string;
  threadId?: string;
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
  threadId: string | null;
  subject: string;
  from: string;
  content: string;
  dateTs: number;
}

export class GmailClient {
  private readonly API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

  constructor(private readonly accessToken: string) {}

  /** Appel générique vers l'API Gmail */
  private async fetchGmail<T>(
    path: string,
    params?: Record<string, string>
  ): Promise<T> {
    const url = new URL(this.API_BASE + path);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gmail API error (${res.status}): ${text}`);
    }

    return res.json() as Promise<T>;
  }

  /**
   * liste les messages dans une plage de dates.
   * startTs / endTs = timestamps en millisecondes.
   * On construit une query "after:... before:... in:inbox".
   */
  async listMessagesByDateRange(
    startTs: number,
    endTs: number,
    maxTotal?: number,
    extraQuery: string = "in:inbox"
  ): Promise<string[]> {
    const afterUnix = Math.floor(startTs / 1000);
    const beforeUnix = Math.floor(endTs / 1000);

    const query = `${extraQuery} after:${afterUnix} before:${beforeUnix}`;

    let nextPageToken: string | undefined;
    const allIds: string[] = [];

    do {
      const data = await this.fetchGmail<GmailListResponse>("/messages", {
        maxResults: "500",
        q: query,
        ...(nextPageToken ? { pageToken: nextPageToken } : {}),
      });

      const ids = data.messages?.map((m) => m.id) ?? [];
      allIds.push(...ids);

      if (maxTotal && allIds.length >= maxTotal) break; // 👈 on ne coupe que si maxTotal est défini
      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    const reversed = [...allIds].reverse();

    return maxTotal ? reversed.slice(0, maxTotal) : reversed;
  }

  /**
   * Liste les messages, retourne seulement leurs IDs.
   * Version simple : on ramène maxResults au total, sans gestion avancée de pagination.
   */
  async listMessages(
    maxResults: number = 50,
    query: string = "in:inbox"
  ): Promise<string[]> {
    const data = await this.fetchGmail<GmailListResponse>("/messages", {
      maxResults: String(maxResults),
      q: query,
    });

    const ids = data.messages?.map((m) => m.id) ?? [];
    return ids;
  }

  /**
   * Récupère le contenu complet d'un message et le normalise dans GmailMessage.
   */
  async getMessage(id: string): Promise<GmailMessage> {
    try {
      const detail = await this.fetchGmail<GmailMessageResponse>(
        `/messages/${id}`,
        { format: "full" }
      );

      const headers = detail.payload?.headers ?? [];
      const subject =
        headers.find((h) => h.name === "Subject")?.value || "(Sans objet)";
      const from =
        headers.find((h) => h.name === "From")?.value || "(Expéditeur inconnu)";
      const dateHeader = headers.find((h) => h.name === "Date")?.value;
      const dateTs = dateHeader ? new Date(dateHeader).getTime() : Date.now();

      const content = GmailMessageExtractor.extractBody(detail.payload);

      const threadId = detail.threadId ?? null; // 👈 on récupère le thread

      return {
        id,
        threadId, // 👈 on l'expose
        subject,
        from,
        content,
        dateTs,
      };
    } catch (err) {
      console.error("[GmailClient] Erreur getMessage:", err);
      return {
        id,
        threadId: null,
        subject: "(Erreur de lecture)",
        from: "(Inconnu)",
        content: "",
        dateTs: Date.now(),
      };
    }
  }
}
