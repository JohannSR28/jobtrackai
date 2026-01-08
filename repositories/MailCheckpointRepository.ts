import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MailCheckpoint,
  MailCheckpointRepository as IMailCheckpointRepository,
  MailProvider,
} from "@/services/scanService";

type MailCheckpointRow = {
  user_id: string;
  provider: MailProvider;
  last_success_at: string | null;
};

function mapRow(r: MailCheckpointRow): MailCheckpoint {
  return {
    userId: r.user_id,
    provider: r.provider,
    lastSuccessAt: r.last_success_at,
  };
}

export class MailCheckpointRepository implements IMailCheckpointRepository {
  constructor(private db: SupabaseClient) {}

  async get(
    userId: string,
    provider: MailProvider
  ): Promise<MailCheckpoint | null> {
    const { data, error } = await this.db
      .from("mail_checkpoints")
      .select("user_id, provider, last_success_at")
      .eq("user_id", userId)
      .eq("provider", provider)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return mapRow(data as unknown as MailCheckpointRow);
  }

  async upsertLastSuccessAt(
    userId: string,
    provider: MailProvider,
    lastSuccessAt: string
  ): Promise<void> {
    const { error } = await this.db.from("mail_checkpoints").upsert(
      {
        user_id: userId,
        provider,
        last_success_at: lastSuccessAt,
      },
      { onConflict: "user_id,provider" }
    );

    if (error) throw error;
  }
}
