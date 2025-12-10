// AiService.ts
import OpenAI from "openai";
import type { GmailMessage } from "./gmailClient";
import { buildJobEmailPrompt } from "@/utils/aiPrompt";
import {
  AnalyzeMailResult,
  JobEmailAnalysisMeta,
  TokenUsage,
} from "@/types/aiTypes";
import { mapRawToJobEmailAnalysis } from "@/utils/aiMapper";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class AiService {
  /**
   * Analyse un email et renvoie :
   * - analysis : résultat métier (isJobEmail, company, role, status, confidence)
   * - meta     : infos techniques (model, requestId, tokenUsage)
   */
  static async analyzeMail(mail: GmailMessage): Promise<AnalyzeMailResult> {
    const prompt = buildJobEmailPrompt(mail);

    console.log(
      `[AiService] Analyzing "${mail.subject}" (${mail.content?.length} chars)`
    );

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 250,
      // JSON mode : le modèle renvoie directement un JSON valide
      response_format: { type: "json_object" },
    });

    const rawContent = completion.choices[0]?.message?.content ?? "{}";
    const usage: TokenUsage = completion.usage || {};

    let rawParsed: unknown = {};
    try {
      rawParsed = JSON.parse(rawContent);
    } catch (err) {
      console.error(
        "[AiService] Failed to parse JSON content:",
        rawContent,
        err
      );
      rawParsed = {};
    }

    const analysis = mapRawToJobEmailAnalysis(rawParsed);

    const meta: JobEmailAnalysisMeta = {
      model: completion.model,
      requestId: completion.id,
      tokenUsage: usage,
    };

    return { analysis, meta };
  }
}
