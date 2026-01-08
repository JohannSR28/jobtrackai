import { MailConnectionRepository } from "@/repositories/MailConnectionRepository";
import { MailConnectionService } from "@/services/MailConnectionService";
import { callWithMailAccess } from "@/utils/mail/callWithMailAccess";
import {
  refreshGmailAccessToken,
  refreshOutlookAccessToken,
} from "@/infra/oauth/refresh";
import { GmailProviderClient } from "@/infra/mail/gmail/GmailProviderClient";
import { OutlookProviderClient } from "@/infra/mail/outlook/OutlookProviderClient";
import type { RawMail } from "@/services/ai/mailAnalysis";
import type { MailProvider } from "@/services/scanService";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface MailReaderApi {
  getRawMailById(
    userId: string,
    provider: MailProvider,
    messageId: string
  ): Promise<RawMail>;
}

export class MailReaderService implements MailReaderApi {
  private mailConnService: MailConnectionService;

  constructor(private supabase: SupabaseClient) {
    const repo = new MailConnectionRepository(supabase);
    this.mailConnService = new MailConnectionService(repo, {
      refreshGmail: refreshGmailAccessToken,
      refreshOutlook: refreshOutlookAccessToken,
    });
  }

  async getRawMailById(
    userId: string,
    provider: MailProvider,
    messageId: string
  ): Promise<RawMail> {
    // On force provider attendu par callWithMailAccess via la connexion existante.
    // Si tu veux *forcer* le provider, on peut ajouter une option à callWithMailAccess.
    const raw = await callWithMailAccess({
      userId,
      service: this.mailConnService,
      call: async ({ provider: p, accessToken }) => {
        const client =
          p === "gmail"
            ? new GmailProviderClient(accessToken)
            : new OutlookProviderClient(accessToken);

        return p === "gmail"
          ? await client.getRawMailById(messageId, 2500)
          : await client.getRawMailById(messageId, 2500);
      },
    });

    // si tu veux vraiment vérifier le provider demandé:
    if (provider !== "gmail" && provider !== "outlook") {
      throw new Error("UNKNOWN_PROVIDER");
    }
    return raw;
  }
}
