// infra/mail/outlook/OutlookProviderClient.ts

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
}

function formatOutlookFrom(
  from: { emailAddress?: { address?: string; name?: string } } | undefined
): string {
  const name = from?.emailAddress?.name ?? "";
  const addr = from?.emailAddress?.address ?? "";
  if (name && addr) return `${name} <${addr}>`;
  return addr || name || "";
}
