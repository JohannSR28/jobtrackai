import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const supabase = await createClient();

  // 1. Vérifier l'utilisateur
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Lire le solde
  const { data, error } = await supabase
    .from("user_wallets")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  // Si pas de ligne trouvée (rare, car le trigger le crée), on renvoie 0
  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    balance: data?.balance ?? 0,
  });
}
