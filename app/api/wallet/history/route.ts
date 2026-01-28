import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Récupération des paramètres
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const mode = searchParams.get("mode") || "detailed"; // 'detailed' ou 'compact'

  const limit = 20;
  const offset = (page - 1) * limit;

  // Appel de la fonction RPC SQL
  const { data, error } = await supabase.rpc("get_wallet_history", {
    p_user_id: user.id,
    p_limit: limit,
    p_offset: offset,
    p_is_compact: mode === "compact",
  });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Pour le total des pages, on fait une estimation rapide ou une 2ème requête
  // Ici pour simplifier on renvoie juste les données, la pagination frontend gérera le "Next"
  // tant qu'il y a des données.

  return NextResponse.json({
    data,
    meta: {
      page,
      hasMore: data.length === limit,
    },
  });
}
