import { createClient } from "@/utils/supabase/server";
import { encrypt, decrypt } from "@/utils/crypto";

/**
 * Repository responsable de la persistance des connexions mail (Gmail, Outlook, etc.)
 * Table: mail_connections
 */
export const MailConnectionsRepository = {
  /**
   * Insère ou met à jour le refresh_token d’un utilisateur pour un provider donné.
   */
  async upsertRefreshToken(params: {
    user_id: string;
    provider: string;
    scope: string;
    refresh_token: string;
  }): Promise<void> {
    const supabase = await createClient();
    const encryptedToken = encrypt(params.refresh_token);

    const { error } = await supabase.from("mail_connections").upsert(
      {
        user_id: params.user_id,
        provider: params.provider,
        scope: params.scope,
        refresh_token: encryptedToken,
        updated_at: new Date(),
      },
      { onConflict: "user_id,provider" } // ✅ clé d’unicité conforme à la table
    );

    if (error) {
      throw new Error(`Failed to save mail connection token: ${error.message}`);
    }
  },

  /**
   * Récupère le refresh_token déchiffré pour un provider donné.
   */
  async getRefreshToken(
    userId: string,
    provider: string
  ): Promise<string | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("mail_connections")
      .select("refresh_token")
      .eq("user_id", userId)
      .eq("provider", provider)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to retrieve refresh token: ${error.message}`);
    }

    const encrypted = data?.refresh_token;
    return encrypted ? decrypt(encrypted) : null;
  },

  /**
   * Supprime le refresh_token d’un provider spécifique pour un utilisateur donné.
   */
  async deleteProviderToken(userId: string, provider: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("mail_connections")
      .delete()
      .eq("user_id", userId)
      .eq("provider", provider);

    if (error) {
      throw new Error(
        `Failed to delete token for ${provider}: ${error.message}`
      );
    }
  },
};
