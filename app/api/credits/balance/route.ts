// app/api/credits/balance/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { UserCreditsService } from "@/services/UserCreditsService";

interface BalanceResponse {
  credits: number;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json<BalanceResponse | { error: string }>(
        { error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const credits = await UserCreditsService.getBalance(user.id);

    return NextResponse.json<BalanceResponse>({ credits });
  } catch (err: unknown) {
    console.error("[API] /api/credits/balance error:", err);
    return NextResponse.json<{ error: string }>(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
