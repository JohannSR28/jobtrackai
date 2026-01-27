import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { TransactionRepository } from "@/repositories/TransactionRepository"; // Assure-toi que ce fichier existe (créé à l'étape précédente)

export async function GET() {
  const supabase = await createClient();

  // 1. Vérifier l'utilisateur
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2. Utiliser le Repository
    const transactionRepo = new TransactionRepository(supabase);
    const balance = await transactionRepo.getBalance(user.id);

    return NextResponse.json({ balance });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
