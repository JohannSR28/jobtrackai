// src/infra/ai/openAIClient.ts
import OpenAI from "openai";
import type {
  AIClient,
  MailAnalysisResult,
  MailStatus,
} from "@/services/ai/mailAnalysis";

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isMailStatus(v: unknown): v is MailStatus {
  return (
    v === "applied" ||
    v === "interview" ||
    v === "rejection" ||
    v === "offer" ||
    v === "unknown"
  );
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function parseMailAnalysisJson(
  v: unknown
): Omit<MailAnalysisResult, "tokensUsed"> {
  if (!isObj(v)) throw new Error("AI_OUTPUT_NOT_OBJECT");

  const isJobRelated = v["isJobRelated"];
  const status = normalizeStatus(v["status"]);
  const confidence = v["confidence"];

  if (typeof isJobRelated !== "boolean") throw new Error("AI_BAD_isJobRelated");
  if (!isMailStatus(status)) throw new Error("AI_BAD_status");
  if (typeof confidence !== "number") throw new Error("AI_BAD_confidence");

  const company = v["company"];
  const position = v["position"];
  const eventType = v["eventType"];
  const reasoning = v["reasoning"];

  return {
    isJobRelated,
    company: company === null || typeof company === "string" ? company : null,
    position:
      position === null || typeof position === "string" ? position : null,
    status,
    eventType:
      eventType === null || typeof eventType === "string" ? eventType : null,
    confidence: clamp01(confidence),
    reasoning:
      reasoning === null || typeof reasoning === "string" ? reasoning : null,
  };
}

export class OpenAIClient implements AIClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async analyzeStructured(input: {
    messages: ReadonlyArray<{ role: "system" | "user"; content: string }>;
  }): Promise<{
    json: Omit<MailAnalysisResult, "tokensUsed">;
    tokensUsed: number;
  }> {
    const resp = await this.client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0,
      //  Force JSON output (pas de schema, mais JSON garanti)
      response_format: { type: "json_object" },
      messages: input.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const content = resp.choices[0]?.message?.content ?? "{}";

    let parsedUnknown: unknown;
    try {
      parsedUnknown = JSON.parse(content) as unknown;
    } catch {
      throw new Error("AI_OUTPUT_NOT_JSON");
    }

    const json = parseMailAnalysisJson(parsedUnknown);

    // tokensUsed fiable (si présent) :
    const tokensUsed = resp.usage?.total_tokens ?? 0;

    return { json, tokensUsed };
  }
}

function normalizeStatus(v: unknown): MailStatus {
  if (typeof v !== "string") return "unknown";
  const s = v.trim().toLowerCase();

  // exact
  if (
    s === "applied" ||
    s === "interview" ||
    s === "rejection" ||
    s === "offer" ||
    s === "unknown"
  ) {
    return s as MailStatus;
  }

  // variantes fréquentes
  if (
    s === "rejected" ||
    s === "reject" ||
    s === "declined" ||
    s.includes("not selected")
  ) {
    return "rejection";
  }
  if (
    s.includes("interview") ||
    s.includes("screen") ||
    s.includes("phone") ||
    s.includes("assessment")
  ) {
    return "interview";
  }
  if (s.includes("offer") || s.includes("contract")) {
    return "offer";
  }
  if (s.includes("appl") || s.includes("submitted") || s.includes("received")) {
    return "applied";
  }

  return "unknown";
}
