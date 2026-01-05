import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

import { MailConnectionRepository } from "@/repositories/MailConnectionRepository";
import { accessTokenCache } from "@/services/MailConnectionService";

/**
 * POST /api/mail/remove
 * Déconnecte UNIQUEMENT le mail (pas la session Supabase)
 */
export async function POST() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;

  if (error || !user) {
    return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
  }

  const repo = new MailConnectionRepository(supabase);

  // Supprime la connexion mail
  await repo.removeByUserId(user.id);

  // Invalide le cache access token (important)
  accessTokenCache.invalidate(user.id);

  return NextResponse.json({ success: true }, { status: 200 });
}
