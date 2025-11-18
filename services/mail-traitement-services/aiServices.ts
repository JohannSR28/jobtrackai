import OpenAI from "openai";
import type { GmailMessage } from "../gmailApiService";

interface TokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface AiAnalysisResult {
  is_job_email: boolean;
  company: string | null;
  role: string | null;
  status: string;
  confidence_company: number | null;
  confidence_role: number | null;
  confidence_status: number | null;
  token_usage: TokenUsage;
  model: string;
  request_id: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cleanJsonResponse(raw: string): string {
  return raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

export class AiService {
  /**
   * Analyse un email et renvoie un objet structuré + coût tokens
   */
  static async analyzeMail(mail: GmailMessage): Promise<AiAnalysisResult> {
    const prompt = `
You are an assistant.
First decide if the email is about a job-application (yes or no).
If yes, return only valid JSON with exactly:
{
  "company": string,
  "role": string,
  "status": one of ["applied","in_review","interview","offer","rejected","manual"],
  "confidence_company": number (0-1),
  "confidence_role": number (0-1),
  "confidence_status": number (0-1)
}
If no, return exactly {}.

Email details:
Subject: ${mail.subject}
From: ${mail.from}
Body: ${mail.content.slice(0, 2500)}

Return nothing else, no markdown, no commentary, just the JSON.
`;

    console.log(
      `[AIService] Analyzing "${mail.subject}" (${mail.content?.length} chars)`
    );

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 250,
    });

    console.log("[AI DEBUG] raw output:", {
      id: completion.id,
      model: completion.model,
      usage: completion.usage,
      message: completion.choices?.[0]?.message?.content,
    });

    const raw = completion.choices[0].message?.content ?? "{}";
    const usage: TokenUsage = completion.usage || {}; // typé ici

    try {
      const clean = cleanJsonResponse(raw);
      const parsed = JSON.parse(clean);

      if (!parsed || Object.keys(parsed).length === 0) {
        return {
          is_job_email: false,
          company: null,
          role: null,
          status: "manual",
          confidence_company: 0,
          confidence_role: 0,
          confidence_status: 0,
          token_usage: usage,
          model: completion.model,
          request_id: completion.id,
        };
      }

      return {
        is_job_email: true,
        company: parsed.company || "Unknown",
        role: parsed.role || "unspecified role",
        status: parsed.status || "applied",
        confidence_company: parsed.confidence_company ?? null,
        confidence_role: parsed.confidence_role ?? null,
        confidence_status: parsed.confidence_status ?? null,
        token_usage: usage,
        model: completion.model,
        request_id: completion.id,
      };
    } catch (err) {
      console.error("❌ Failed to parse AI response:", raw, err);
      return {
        is_job_email: false,
        company: null,
        role: null,
        status: "manual",
        confidence_company: 0,
        confidence_role: 0,
        confidence_status: 0,
        token_usage: usage,
        model: completion.model,
        request_id: completion.id,
      };
    }
  }
}
