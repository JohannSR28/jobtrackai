// src/utils/textCleaner.ts

/**
 * Nettoie une chaîne HTML en texte brut lisible
 * - supprime CSS, scripts, et balises HTML
 */
export function cleanHtmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
