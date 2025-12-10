export function computeCreditsFromTokens(tokens: number): number {
  if (tokens <= 0) return 0;

  // exemple : 1 crédit par tranche de 1 000 tokens
  return Math.floor(tokens / 1000);
}
