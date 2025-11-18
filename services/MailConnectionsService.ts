import { MailConnectionsRepository } from "@/repositories/MailConnectionsRepository";

/** Cache global des access tokens (par user+provider) */
const accessTokenCache = new Map<
  string,
  { token: string; expiresAt: number }
>();

export type MailProvider = "gmail" | "outlook";

interface ProviderConfig {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface ExchangeTokenResponse {
  access_token: string;
  expires_in: number; // en secondes
  refresh_token?: string;
  scope?: string;
  token_type: string;
  error?: string;
  error_description?: string;
}

export class MailConnectionsService {
  private config: ProviderConfig;

  constructor(
    private readonly userId: string,
    private readonly provider: MailProvider
  ) {
    this.config = this.getProviderConfig(provider);
  }

  /** Configuration par provider */
  private getProviderConfig(provider: MailProvider): ProviderConfig {
    switch (provider) {
      case "gmail":
        return {
          tokenUrl: "https://oauth2.googleapis.com/token",
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/google/oauth/callback`,
        };
      case "outlook":
        return {
          tokenUrl:
            "https://login.microsoftonline.com/common/oauth2/v2.0/token",
          clientId: process.env.OUTLOOK_CLIENT_ID!,
          clientSecret: process.env.OUTLOOK_CLIENT_SECRET!,
          redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/outlook/oauth/callback`,
        };
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /** Vérifie si la connexion OAuth est encore valide */
  async checkConnectionStatus(): Promise<{ connected: boolean }> {
    try {
      // Vérifie si le refresh_token existe dans la table
      const refreshToken = await MailConnectionsRepository.getRefreshToken(
        this.userId,
        this.provider
      );

      if (!refreshToken) {
        return { connected: false };
      }

      // Vérifie si on a un access token encore actif dans le cache
      const cacheKey = `${this.userId}:${this.provider}`;
      const cached = accessTokenCache.get(cacheKey);
      const now = Date.now();

      if (cached && cached.expiresAt > now) {
        return { connected: true };
      }

      // Sinon, essaie de rafraîchir l'access token pour tester le refresh_token
      await this.refreshAccessToken(true);
      return { connected: true };
    } catch (err) {
      console.warn(" checkConnectionStatus failed:", err);
      return { connected: false };
    }
  }

  /** Force le rafraîchissement du token et met à jour le cache */
  async refreshAccessToken(silent = false): Promise<{ refreshed: boolean }> {
    const refreshToken = await MailConnectionsRepository.getRefreshToken(
      this.userId,
      this.provider
    );

    //  Cas 1 : aucun refresh_token stocké → suppression de la ligne
    if (!refreshToken) {
      await MailConnectionsRepository.deleteProviderToken(
        this.userId,
        this.provider
      );
      throw new Error("Aucun refresh_token trouvé — connexion supprimée.");
    }

    try {
      const res = await fetch(this.config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      const data = await res.json();

      //  Cas 2 : refresh_token invalide → suppression + erreur claire
      if (data.error) {
        console.error(" Erreur de refresh:", data);
        await MailConnectionsRepository.deleteProviderToken(
          this.userId,
          this.provider
        );
        throw new Error("Le refresh_token est invalide ou expiré.");
      }

      //  Cas 3 : tout va bien → mise à jour du cache
      const expiresAt = Date.now() + data.expires_in * 1000 - 60_000;
      accessTokenCache.set(`${this.userId}:${this.provider}`, {
        token: data.access_token,
        expiresAt,
      });

      return { refreshed: true };
    } catch (err) {
      console.error(" Network or fetch error:", err);

      // on ne supprime rien ici, c’est une panne réseau temporaire
      if (!silent)
        throw new Error("Échec de communication avec le serveur OAuth.");
      return { refreshed: false };
    }
  }

  async getValidAccessToken(): Promise<string> {
    const cacheKey = `${this.userId}:${this.provider}`;
    const cached = accessTokenCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    const result = await this.refreshAccessToken();
    if (!result.refreshed)
      throw new Error("Impossible d’obtenir un token valide.");
    return accessTokenCache.get(cacheKey)?.token ?? "";
  }

  /**
   * 🚀 Connecte un nouvel utilisateur et enregistre son refresh_token.
   */
  async handleAuthorizationCode(code: string): Promise<void> {
    const body = new URLSearchParams({
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      grant_type: "authorization_code",
    });

    const res = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const tokens: ExchangeTokenResponse = await res.json();

    if (tokens.error) {
      throw new Error(
        `${this.provider} OAuth error: ${
          tokens.error_description || tokens.error
        }`
      );
    }

    if (!tokens.refresh_token) {
      throw new Error(
        `${this.provider} did not return a refresh_token (possibly already granted)`
      );
    }

    await MailConnectionsRepository.upsertRefreshToken({
      user_id: this.userId,
      provider: this.provider,
      scope: tokens.scope || "unknown",
      refresh_token: tokens.refresh_token,
    });

    //  On peut aussi initialiser le cache dès maintenant
    if (tokens.access_token && tokens.expires_in) {
      const expiresAt = Date.now() + tokens.expires_in * 1000 - 60_000;
      accessTokenCache.set(`${this.userId}:${this.provider}`, {
        token: tokens.access_token,
        expiresAt,
      });
    }
  }

  /**
   * Révoque la connexion mail pour un utilisateur donné.
   * Supprime la ligne correspondante dans `mail_connections`.
   */
  async revokeConnection(): Promise<{ revoked: boolean }> {
    try {
      await MailConnectionsRepository.deleteProviderToken(
        this.userId,
        this.provider
      );

      console.info(
        `[MailConnectionsService] Connexion ${this.provider} révoquée pour ${this.userId}`
      );

      return { revoked: true };
    } catch (err) {
      console.error(
        `[MailConnectionsService] Échec de révocation ${this.provider}:`,
        err
      );
      throw new Error("Impossible de révoquer la connexion.");
    }
  }
}
