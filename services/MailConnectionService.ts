// src/application/services/MailConnectionService.ts
import type {
  MailProvider,
  MailConnectionRepository,
} from "@/repositories/MailConnectionRepository";

export type AccessOk = {
  ok: true;
  provider: MailProvider;
  email: string;
  accessToken: string;
};

export type AccessFail = {
  ok: false;
  action: "REAUTH";
};

export type AccessResult = AccessOk | AccessFail;

type Cached = {
  provider: MailProvider;
  email: string;
  accessToken: string;
};

class AccessTokenCache {
  private map = new Map<string, Cached>();

  get(userId: string): Cached | null {
    return this.map.get(userId) ?? null;
  }

  set(userId: string, value: Cached) {
    this.map.set(userId, value);
  }

  invalidate(userId: string) {
    this.map.delete(userId);
  }
}

export const accessTokenCache = new AccessTokenCache();

export class MailConnectionService {
  constructor(
    private repo: MailConnectionRepository,
    private oauth: {
      refreshGmail(refreshToken: string): Promise<string>;
      refreshOutlook(refreshToken: string): Promise<string>;
    }
  ) {}

  async isConnected(userId: string): Promise<boolean> {
    const conn = await this.repo.getByUserId(userId);
    return !!conn;
  }

  /**
   * Cache-first. Si pas en cache => refresh via DB.
   * Ne “teste” pas l’API. Il ne fait que fournir un token.
   */
  async getAccessToken(userId: string): Promise<AccessResult> {
    const cached = accessTokenCache.get(userId);
    if (cached) return { ok: true, ...cached };

    const conn = await this.repo.getByUserId(userId);
    if (!conn) return { ok: false, action: "REAUTH" };

    const accessToken = await this.refresh(conn.provider, conn.refreshToken);
    if (!accessToken) return await this.reauth(userId);

    const result: Cached = {
      provider: conn.provider,
      email: conn.email,
      accessToken,
    };
    accessTokenCache.set(userId, result);
    return { ok: true, ...result };
  }

  /**
   * À appeler UNIQUEMENT quand ton ProviderClient a renvoyé 401.
   * Invalide cache puis refresh.
   */
  async handleUnauthorized(userId: string): Promise<AccessResult> {
    accessTokenCache.invalidate(userId);

    const conn = await this.repo.getByUserId(userId);
    if (!conn) return { ok: false, action: "REAUTH" };

    const accessToken = await this.refresh(conn.provider, conn.refreshToken);
    if (!accessToken) return await this.reauth(userId);

    const result: Cached = {
      provider: conn.provider,
      email: conn.email,
      accessToken,
    };
    accessTokenCache.set(userId, result);
    return { ok: true, ...result };
  }

  private async refresh(
    provider: MailProvider,
    refreshToken: string
  ): Promise<string | null> {
    try {
      return provider === "gmail"
        ? await this.oauth.refreshGmail(refreshToken)
        : await this.oauth.refreshOutlook(refreshToken);
    } catch {
      return null;
    }
  }

  private async reauth(userId: string): Promise<AccessFail> {
    await this.repo.removeByUserId(userId);
    accessTokenCache.invalidate(userId);
    return { ok: false, action: "REAUTH" };
  }
}
