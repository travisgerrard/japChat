// Utility functions for Japanese text processing and breakdowns

export function extractSections(markdown: string) {
  // More robust extraction: allow for --- or ### or end of string as section boundaries
  const jpMatch = markdown.match(/### Japanese Text\s*\n+([\s\S]+?)(?:\n###|\n---|$)/);
  const enMatch = markdown.match(/### English Translation\s*\n+([\s\S]+?)(?:\n###|\n---|$)/);
  return {
    japanese: jpMatch ? jpMatch[1].trim() : '',
    english: enMatch ? enMatch[1].trim() : '',
  };
}

export function stripFurigana(text: string) {
  // Remove furigana in the form 漢字(かんじ)
  return text.replace(/\([^)]+\)/g, '');
}

export function splitSentences(text: string) {
  // Avoid splitting inside Japanese quotes (「」 and 『』)
  // We'll split only on 。！？ that are not inside quotes
  const sentences: string[] = [];
  let current = '';
  let quoteLevel = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '「' || char === '『') quoteLevel++;
    if (char === '」' || char === '』') quoteLevel = Math.max(0, quoteLevel - 1);
    current += char;
    if ((char === '。' || char === '！' || char === '？') && quoteLevel === 0) {
      sentences.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) sentences.push(current.trim());
  return sentences.filter(Boolean);
}

export function normalizeForSimilarity(text: string) {
  // Remove punctuation, whitespace, and all quote marks (Japanese and Western)
  return text
    .replace(/[\s\u3000]/g, '') // Remove all spaces (ASCII and Japanese)
    .replace(/[。、．，,.!！?？「」『』"']/g, '') // Remove common punctuation and quotes
    .replace(/[\uFF01-\uFF5E]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)) // Full-width to half-width
    .toLowerCase();
}

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

// computeSimilarity depends on normalizeToHiragana, which is imported from elsewhere
export async function computeSimilarity(a: string, b: string, normalizeToHiragana: (s: string) => Promise<string>): Promise<number> {
  // Normalize both strings to hiragana
  const [normA, normB] = await Promise.all([
    normalizeToHiragana(a),
    normalizeToHiragana(b)
  ]);
  if (!normA || !normB) return 0;
  // Further normalize: trim, remove punctuation, unify unicode
  const normedA = normalizeForSimilarity(normA);
  const normedB = normalizeForSimilarity(normB);
  const dist = levenshtein(normedA, normedB);
  const maxLen = Math.max(normedA.length, normedB.length);
  if (maxLen === 0) return 100;
  return Math.round(100 * (1 - dist / maxLen));
}

// --- Breakdown Parsing Helper ---
export type BreakdownItem = {
  word: string;
  kanji: string;
  reading: string;
  romaji: string;
  meaning: string;
  explanation: string;
  sentenceIdx?: number;
};

export type BreakdownJSON = {
  breakdown: Array<{
    japanese: string;
    kanji: string;
    reading: string;
    romaji: string;
    meaning: string;
    explanation: string;
  }>;
  translation: string;
  fallback_markdown?: string;
};

export function parseBreakdown(json: BreakdownJSON, sentenceIdx?: number): BreakdownItem[] {
  if (!json || !Array.isArray(json.breakdown)) return [];
  return json.breakdown.map(item => ({
    word: item.japanese,
    kanji: item.kanji,
    reading: item.reading,
    romaji: item.romaji,
    meaning: item.meaning,
    explanation: item.explanation,
    sentenceIdx,
  }));
}

// --- Helper to extract JSON code block from markdown ---
export function extractJSONSection(markdown: string, key: 'vocab_notes' | 'grammar_notes'): unknown[] {
  // Try to find a JSON code block
  const match = markdown.match(/```json[\s\S]+?({[\s\S]+?})[\s\S]+?```/);
  if (match) {
    try {
      const json = JSON.parse(match[1]);
      if (Array.isArray(json[key])) return json[key];
    } catch {}
  }
  // Fallback: try to find a JSON object in the text
  const fallback = markdown.match(/({[\s\S]+})/);
  if (fallback) {
    try {
      const json = JSON.parse(fallback[1]);
      if (Array.isArray(json[key])) return json[key];
    } catch {}
  }
  return [];
} 