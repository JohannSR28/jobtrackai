// utils/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";

/**
 * createAdminClient()
 *
 * Client Supabase avec le `service_role`.
 * - A utiliser UNIQUEMENT côté serveur (route handlers, server actions, CRON).
 * - Accès total, bypass RLS.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in environment variables"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
