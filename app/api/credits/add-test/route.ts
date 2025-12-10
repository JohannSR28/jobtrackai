// app/api/credits/add-test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { UserCreditsService } from "@/services/UserCreditsService";
import type { CreditTransaction } from "@/repositories/CreditTransactionsRepository";

interface AddCreditsRequestBody {
  amount?: number;
}

interface AddCreditsResponse {
  credits: number;
  transaction: CreditTransaction;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json<{ error: string }>(
        { error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    let body: AddCreditsRequestBody | null = null;
    try {
      body = (await req.json()) as AddCreditsRequestBody;
    } catch {
      body = null;
    }

    // Par défaut : 1000 crédits = 5$
    const amount = typeof body?.amount === "number" ? body.amount : 1000;

    if (amount <= 0) {
      return NextResponse.json<{ error: string }>(
        { error: "Amount must be > 0" },
        { status: 400 }
      );
    }

    const transaction = await UserCreditsService.addStripeCredits({
      userId: user.id,
      amount,
      metadata: {
        test: true,
        description: "Test top-up from /api/credits/add-test",
      },
      reason: "Recharge de crédits (test 5$)",
    });

    const credits = await UserCreditsService.getBalance(user.id);

    return NextResponse.json<AddCreditsResponse>({
      credits,
      transaction,
    });
  } catch (err: unknown) {
    console.error("[API] /api/credits/add-test error:", err);
    return NextResponse.json<{ error: string }>(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
