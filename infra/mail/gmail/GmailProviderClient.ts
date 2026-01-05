// infra/mail/gmail/GmailProviderClient.ts

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
}

function getHeader(
  headers: Array<{ name: string; value: string }>,
  name: string
): string {
  const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}
