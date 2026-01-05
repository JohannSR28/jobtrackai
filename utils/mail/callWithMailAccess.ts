// src/application/utils/callWithMailAccess.ts
import type {
  MailConnectionService,
  AccessOk,
} from "@/services/MailConnectionService";
export class ReauthRequiredError extends Error {
  code = "REAUTH_REQUIRED";
  constructor(message = "Mail re-auth required") {
    super(message);
  }
}

export async function callWithMailAccess<T>(options: {
  userId: string;
  service: Pick<MailConnectionService, "getAccessToken" | "handleUnauthorized">;
  call: (input: AccessOk) => Promise<T>;
}): Promise<T> {
  const { userId, service, call } = options;

  const first = await service.getAccessToken(userId);
  if (!first.ok) throw new ReauthRequiredError();

  try {
    return await call(first);
  } catch (err: unknown) {
    if (!isUnauthorized(err)) throw err;

    const second = await service.handleUnauthorized(userId);
    if (!second.ok) throw new ReauthRequiredError();

    return await call(second);
  }
}

function isUnauthorized(err: unknown): boolean {
  if (!isRecord(err)) return false;

  const status = err["status"];
  const code = err["code"];

  return status === 401 || code === 401;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
