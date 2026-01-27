import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ScanRepository } from "@/repositories/scanRepository";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // On instancie le repo
  const scanRepo = new ScanRepository(supabase);

  // On cherche juste s'il y a un scan actif
  const activeScan = await scanRepo.findActiveScan(user.id);

  // On renvoie le scan (ou null)
  return NextResponse.json({ scan: activeScan });
}
