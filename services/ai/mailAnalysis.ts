// src/modules/mailAnalysis/mailAnalysis.ts
export type RawMail = Readonly<{
  id: string;
  from: string | null;
  subject: string | null;
  date: string; // ISO
  snippet: string | null;
  body: string | null; // texte plain (pas HTML)
  headers: ReadonlyArray<{ name: string; value: string }>;
}>;

export type MailStatus =
  | "applied"
  | "interview"
  | "rejection"
  | "offer"
  | "unknown";

export type MailAnalysisResult = Readonly<{
  isJobRelated: boolean;
  company: string | null;
  position: string | null;
  status: MailStatus;
  eventType: string | null;
  confidence: number; // 0..1
  reasoning: string | null;
  tokensUsed: number;
}>;

// JSON Schema (pour sortie IA stable)
export const mailAnalysisJsonSchema = {
  name: "mail_analysis_result",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      isJobRelated: { type: "boolean" },
      company: { type: ["string", "null"], minLength: 1 },
      position: { type: ["string", "null"], minLength: 1 },
      status: {
        type: "string",
        enum: ["applied", "interview", "rejection", "offer", "unknown"],
      },
      eventType: { type: ["string", "null"], minLength: 1 },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      reasoning: { type: ["string", "null"] },
    },
    required: [
      "isJobRelated",
      "company",
      "position",
      "status",
      "eventType",
      "confidence",
      "reasoning",
    ],
  },
} as const;

// Prompt amélioré anti “job alerts”
function buildMessages(
  mail: Pick<RawMail, "from" | "subject" | "date" | "snippet" | "body">
) {
  return [
    {
      role: "system" as const,
      content:
        "You are an information extraction engine. Return ONLY a JSON object matching the given JSON Schema. " +
        "No markdown. No extra keys. Never invent facts.",
    },
    {
      role: "user" as const,
      content:
        "Task: Determine whether this email is part of a job application process and extract structured fields.\n\n" +
        "IMPORTANT NEGATIVE RULES (set isJobRelated=false):\n" +
        "- Job alerts / recommended jobs / newsletters (LinkedIn alerts, Indeed alerts, 'jobs you may like')\n" +
        "- General career content, marketing, promos, unrelated notifications\n" +
        "- Messages about OTHER people's hiring not involving the recipient's application\n\n" +
        "Output constraints:\n" +
        "- status MUST be exactly one of: applied | interview | rejection | offer | unknown\n" +
        "- If you would output something else (e.g. rejected, interviewing, screening), map it to the closest allowed value.\n" +
        "- If job alert/newsletter => isJobRelated=false and status=unknown\n\n" +
        "POSITIVE RULES (isJobRelated=true):\n" +
        "- Confirmation of application received/submitted\n" +
        "- Interview invitation/scheduling/next steps\n" +
        "- Rejection/decline/not selected\n" +
        "- Offer/contract/compensation/offer call\n" +
        "- Recruiter outreach about a specific role asking to interview / apply / continue\n\n" +
        "Fields:\n" +
        "- company and position: ONLY if explicitly present; else null\n" +
        "- status:\n" +
        "  applied = application confirmation\n" +
        "  interview = any interview/assessment scheduling\n" +
        "  rejection = rejection message\n" +
        "  offer = offer message\n" +
        "  unknown = job-related but unclear stage\n" +
        "- eventType examples: recruiter_outreach, phone_screen, take_home, onsite, offer_call, general_update\n" +
        "- confidence: 0..1\n\n" +
        `Email:\nFrom: ${mail.from ?? ""}\nSubject: ${
          mail.subject ?? ""
        }\nDate: ${mail.date}\nSnippet: ${mail.snippet ?? ""}\nBody:\n${
          mail.body ?? ""
        }`,
    },
  ];
}

export interface AIClient {
  analyzeStructured(input: {
    messages: ReadonlyArray<{ role: "system" | "user"; content: string }>;
  }): Promise<{
    json: Omit<MailAnalysisResult, "tokensUsed">;
    tokensUsed: number;
  }>;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export class MailAnalysisService {
  constructor(private ai: AIClient) {}

  async analyzeMail(rawMail: RawMail): Promise<MailAnalysisResult> {
    const { json, tokensUsed } = await this.ai.analyzeStructured({
      messages: buildMessages(rawMail),
    });

    const normalized: MailAnalysisResult = {
      ...json,
      confidence: clamp01(json.confidence),
      company: json.isJobRelated ? json.company : null,
      position: json.isJobRelated ? json.position : null,
      status: json.isJobRelated ? json.status : "unknown",
      eventType: json.isJobRelated ? json.eventType : null,
      reasoning: json.reasoning,
      tokensUsed,
    };

    return normalized;
  }
}
