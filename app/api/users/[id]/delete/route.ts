import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
/**
 * DELETE /api/users/:id/delete
 * → supprime le user + cascade DB
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();

  // 1) Auth user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2) Sécurité stricte
  if (user.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3) Supabase Admin client (service_role)
  const supabaseAdmin = createAdminClient();

  // 4) Delete user (cascade auth -> DB)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
