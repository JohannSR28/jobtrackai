// aiPrompt.ts

import type { GmailMessage } from "@/services/gmailClient";

export function buildJobEmailPrompt(mail: GmailMessage): string {
  const body = mail.content.slice(0, 2500);

  return `
You classify emails **strictly** about the user's own job application process.

Keep only emails that clearly belong to a specific application pipeline
(1 user → 1 company → 1 role). Be conservative.

RELEVANT (keep):
- Application confirmations ("we received your application", "thank you for applying").
- Emails saying the application is under review or moving forward/not moving forward.
- Interview invitations, confirmations, rescheduling, links.
- Job offers or contract/offer letters.
- Clear rejections for a specific application.

NOT RELEVANT (return {}):
- Generic job alerts, newsletters, recommendations, mass marketing from job platforms
  (Indeed, LinkedIn, etc.) or companies ("we are hiring", "new jobs available").
- Announcements like "PizzaPizza is hiring" if there is no sign the user already applied.
- Discussions with colleagues/friends/mentors about jobs, advice, referrals, tips.
- Company news, internal updates, HR announcements not clearly about the user's candidacy.
- Any email where you are not reasonably sure it refers to a specific application
  of the user for a specific role.

If in doubt, treat it as NOT RELEVANT and return {}.

-----------------------
CLASSIFICATION
-----------------------

Step 1:
- Decide if the email is part of the user's own job application pipeline.
  If NO → return exactly: {}

Step 2 (only if YES):
- Extract:
  - company: company/organization name
  - role: job title / role
  - status: one of ["applied","in_review","interview","offer","rejected"]
  - confidence_company: number between 0 and 1
  - confidence_role: number between 0 and 1
  - confidence_status: number between 0 and 1

Be honest with uncertainty: if you are unsure, lower the confidence score.
If you cannot assign a clear status among the 5 values above, treat the email as NOT RELEVANT.

-----------------------
OUTPUT FORMAT (STRICT)
-----------------------

- If NOT related to the user's job application process, return exactly:
{}

- If related, return a single JSON object (no markdown, no comments):

{
  "company": string,
  "role": string,
  "status": "applied" | "in_review" | "interview" | "offer" | "rejected",
  "confidence_company": number,
  "confidence_role": number,
  "confidence_status": number
}

Email:
Subject: ${mail.subject}
From: ${mail.from}
Body:
${body}
`;
}
