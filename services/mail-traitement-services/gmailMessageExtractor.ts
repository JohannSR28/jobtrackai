// src/services/gmailMessageExtractor.ts
import { decode as decodeBase64 } from "js-base64";
import { cleanHtmlToText } from "./textCleaner";

interface GmailPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
}

export class GmailMessageExtractor {
  /**
   * Extrait le texte brut (text/plain ou text/html nettoyé)
   * depuis un payload Gmail
   */
  static extractBody(payload?: {
    body?: { data?: string };
    parts?: GmailPart[];
    mimeType?: string;
  }): string {
    if (!payload) return "";

    // Cas simple
    if (payload.body?.data) {
      const decoded = this.decodeData(payload.body.data, payload.mimeType);
      if (decoded) return decoded.slice(0, 2500);
    }

    // Cas récursif (multipart)
    if (payload.parts && payload.parts.length > 0) {
      for (const part of payload.parts) {
        const result = this.extractBody(part);
        if (result) return result.slice(0, 2500);
      }
    }

    return "";
  }

  /** 🧩 Décode Base64 + nettoie le HTML si nécessaire */
  private static decodeData(data: string, mimeType?: string): string {
    try {
      let text = decodeBase64(data);
      if (mimeType === "text/html") {
        text = cleanHtmlToText(text);
      }
      return text.trim();
    } catch {
      return "";
    }
  }
}
