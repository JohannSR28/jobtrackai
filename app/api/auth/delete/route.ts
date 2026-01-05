import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  // 1) Vérifie que l'utilisateur est loggé (session Supabase)
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;

  if (error || !user) {
    return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
  }

  // 2) Client admin (service_role) => suppression réelle dans auth.users
  const admin = createAdminClient();

  // 3) Supprime l'utilisateur auth (cascade supprimera mail_connections si FK ON DELETE CASCADE)
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);

  if (delErr) {
    return NextResponse.json(
      { error: delErr.message ?? "DELETE_FAILED" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
