export function extractSentences(japaneseText: string): string[] {
  return japaneseText
    .split(/(?<=[。！？])\s*|\n+/)
    .map(s => s.trim())
    .filter(Boolean);
} 