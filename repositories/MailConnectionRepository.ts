import { SupabaseClient } from "@supabase/supabase-js";
import {
  encryptRefreshToken,
  decryptRefreshToken,
} from "@/utils/crypto/refreshTokenCrypto";

export type MailProvider = "gmail" | "outlook";

export type MailConnection = {
  userId: string;
  provider: MailProvider;
  email: string;
  refreshToken: string;
};

export class MailConnectionRepository {
  constructor(private supabase: SupabaseClient) {}

  async getByUserId(userId: string): Promise<MailConnection | null> {
    const { data, error } = await this.supabase
      .from("mail_connections")
      .select("user_id, provider, email, refresh_token")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const refreshToken = decryptRefreshToken(data.refresh_token);

    return {
      userId: data.user_id,
      provider: data.provider,
      email: data.email,
      refreshToken: refreshToken,
    };
  }

  async save(input: MailConnection): Promise<void> {
    const encrypted = encryptRefreshToken(input.refreshToken);

    const { error } = await this.supabase.from("mail_connections").upsert(
      {
        user_id: input.userId,
        provider: input.provider,
        email: input.email,
        refresh_token: encrypted,
      },
      { onConflict: "user_id" }
    );

    if (error) throw error;
  }

  async removeByUserId(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from("mail_connections")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;
  }
}
