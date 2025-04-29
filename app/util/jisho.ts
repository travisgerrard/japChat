// Jisho API utility for Daddy Long Legs

export interface JishoJapanese {
  word?: string;
  reading?: string;
}

export interface JishoSense {
  english_definitions: string[];
  parts_of_speech: string[];
}

export interface JishoResult {
  slug: string;
  is_common: boolean;
  tags: string[];
  jlpt: string[];
  japanese: JishoJapanese[];
  senses: JishoSense[];
}

export interface JishoResponse {
  data: JishoResult[];
}

export async function fetchJishoWord(keyword: string): Promise<JishoResult | null> {
  const url = `/api/jisho?keyword=${encodeURIComponent(keyword)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data: JishoResponse = await res.json();
  return data.data[0] || null;
}

export async function fetchJishoReading(keyword: string): Promise<string | null> {
  const result = await fetchJishoWord(keyword);
  if (!result) return null;
  return result.japanese[0]?.reading || null;
}

// Utility to normalize a Japanese sentence to hiragana using Jisho API
export async function normalizeToHiragana(sentence: string): Promise<string> {
  // Split sentence into words (simple split, or use your tokenizer)
  // For now, split by spaces and fallback to original if not found
  const words = sentence.split(/\s+/).filter(Boolean);
  if (words.length === 0) return sentence;
  const readings: string[] = [];
  for (const word of words) {
    const reading = await fetchJishoReading(word);
    readings.push(reading || word);
  }
  return readings.join('');
} 