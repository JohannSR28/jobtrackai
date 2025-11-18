import { NextResponse } from "next/server";
import { AiService } from "@/services/mail-traitement-services/aiServices";

export async function POST(req: Request) {
  try {
    const { mail } = await req.json();
    const result = await AiService.analyzeMail(mail);

    return NextResponse.json({
      result,
      cost: {
        prompt_tokens: result.token_usage?.prompt_tokens ?? 0,
        completion_tokens: result.token_usage?.completion_tokens ?? 0,
        total_tokens: result.token_usage?.total_tokens ?? 0,
        credits: Math.ceil((result.token_usage?.total_tokens ?? 0) / 1000),
      },
    });
  } catch (err) {
    console.error("AnalyzeMail failed:", err);
    return NextResponse.json({ error: "Erreur d'analyse" }, { status: 500 });
  }
}
