/**
 * Parses the AI markdown response into its main sections.
 */
export function parseAIResponse(markdown: string): {
  title: string;
  japanese_text: string;
  english_text: string;
  vocab_notes: string;
  grammar_notes: string;
  questions: string;
  usage_tips: string;
} {
  // ... function body from route.ts ...
  console.log("Raw Markdown:", markdown);
  const titleMatch = markdown.match(/### Story Title \(Japanese with Romaji\)\s*\r?\n+([\s\S]+?)(?=\n###)/);
  const jpTextMatch = markdown.match(/### Japanese Text\s*\r?\n+([\s\S]+?)(?=\n### English Translation)/);
  const enTextMatch = markdown.match(/### English Translation\s*\r?\n+([\s\S]+?)(?=\n### Vocabulary Notes)/);
  const vocabMatch = markdown.match(/### Vocabulary Notes\s*\r?\n+([\s\S]+?)(?=\n### Detailed Grammar Discussion)/);
  const grammarMatch = markdown.match(/### Detailed Grammar Discussion\s*\r?\n+([\s\S]+?)(?=\n### Practice Questions)/);
  const questionsMatch = markdown.match(/### Practice Questions\s*\r?\n+([\s\S]+?)(?=\n### Usage Tips)/);
  const tipsMatch = markdown.match(/### Usage Tips\s*\r?\n+([\s\S]+)/);
  return {
    title: titleMatch?.[1]?.trim() ?? 'Parsing Error: Title not found',
    japanese_text: jpTextMatch?.[1]?.trim() ?? 'Parsing Error: Japanese text not found',
    english_text: enTextMatch?.[1]?.trim() ?? 'Parsing Error: English text not found',
    vocab_notes: vocabMatch?.[1]?.trim() ?? 'Parsing Error: Vocab notes not found',
    grammar_notes: grammarMatch?.[1]?.trim() ?? 'Parsing Error: Grammar notes not found',
    questions: questionsMatch?.[1]?.trim() ?? 'Parsing Error: Questions not found',
    usage_tips: tipsMatch?.[1]?.trim() ?? 'Parsing Error: Usage tips not found',
  };
}

/**
 * Extracts vocabulary items from the Vocabulary Notes section.
 */
export function extractVocabulary(vocabNotesSection: string): Array<{ word: string; kanji?: string; reading: string; meaning: string; context_sentence?: string }> {
  // ... function body from route.ts ...
  const vocabItems: Array<{ word: string; kanji?: string; reading: string; meaning: string; context_sentence?: string }> = [];
  if (!vocabNotesSection) return vocabItems;
  const lines = vocabNotesSection.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const match = line.match(/^[-*]\s*\*\*([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+)\(([^)]+)\):\s*([^*]+)\*\*\s*[–-]\s*([^;]+);\s*([^;]+);\s*(.+)$/u);
    if (match) {
      const [, word, reading, romaji, meaning, kanji, context_sentence] = match;
      vocabItems.push({ word, reading: reading.trim(), meaning: meaning.trim(), kanji: kanji.trim() === 'N/A' ? undefined : kanji.trim(), context_sentence: context_sentence.trim() });
      continue;
    }
    const fallback = line.match(/^[-*]\s*\*\*([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+)\(([^)]+)\):\s*([^*]+)\*\*\s*[–-]\s*([^;]+);\s*(.+)$/u);
    if (fallback) {
      const [, word, reading, romaji, meaning, context_sentence] = fallback;
      vocabItems.push({ word, reading: reading.trim(), meaning: meaning.trim(), context_sentence: context_sentence.trim() });
      continue;
    }
    const fallback2 = line.match(/^[-*]\s*\*\*([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+)\(([^)]+)\):\s*([^*]+)\*\*\s*[–-]\s*([^;]+)$/u);
    if (fallback2) {
      const [, word, reading, romaji, meaning] = fallback2;
      vocabItems.push({ word, reading: reading.trim(), meaning: meaning.trim() });
      continue;
    }
    const fallback3 = line.match(/^[-*]\s*\*\*([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+)\(([^)]+)\):\s*([^*]+)\*\*\s*[–-]\s*([^;]+);\s*[–-]\s*(.+)$/u);
    if (fallback3) {
      const [, word, reading, romaji, meaning, context_sentence] = fallback3;
      vocabItems.push({ word, reading: reading.trim(), meaning: meaning.trim(), context_sentence: context_sentence.trim() });
      continue;
    }
    const fallback4 = line.match(/^[-*]\s*\*\*([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+)\(([^)]+)\):\s*([^*]+)\*\*\s*[–-]\s*([^;]+)$/u);
    if (fallback4) {
      const [, word, reading, romaji, meaning] = fallback4;
      vocabItems.push({ word, reading: reading.trim(), meaning: meaning.trim() });
      continue;
    }
    const katakanaOnly = line.match(/^[-*]\s*\*\*([\p{Script=Katakana}]+)\*\*\s*[–-]\s*([^;]+);\s*(.+)$/u);
    if (katakanaOnly) {
      const [, word, meaning, context_sentence] = katakanaOnly;
      vocabItems.push({ word, reading: word, meaning: meaning.trim(), context_sentence: context_sentence.trim() });
      continue;
    }
    const katakanaOnly2 = line.match(/^[-*]\s*\*\*([\p{Script=Katakana}]+)\*\*\s*[–-]\s*([^;]+)$/u);
    if (katakanaOnly2) {
      const [, word, meaning] = katakanaOnly2;
      vocabItems.push({ word, reading: word, meaning: meaning.trim() });
      continue;
    }
    if (line) {
      console.warn('[SRS] Unmatched vocab line:', line);
    }
  }
  return vocabItems;
}

/**
 * Extracts grammar points from the Grammar Notes section.
 */
export function extractGrammar(grammarNotesSection: string): Array<{ grammar_point: string; label: string; explanation: string; story_usage: string; narrative_connection: string; example_sentence: string }> {
  // ... function body from route.ts ...
  const grammarItems: Array<{ grammar_point: string; label: string; explanation: string; story_usage: string; narrative_connection: string; example_sentence: string }> = [];
  if (!grammarNotesSection) return grammarItems;
  const points = grammarNotesSection.split(/####\s*Grammar Point:/).map((s, i) => (i === 0 ? s : 'Grammar Point:' + s)).filter(Boolean);
  for (const point of points) {
    let grammar_point = '', label = '', explanation = '', story_usage = '', narrative_connection = '', example_sentence = '';
    const lines = point.split('\n').map(l => l.trim());
    for (const line of lines) {
      if (line.startsWith('Grammar Point:')) grammar_point = line.replace('Grammar Point:', '').trim();
      else if (line.startsWith('**English Name:**')) label = line.replace('**English Name:**', '').trim();
      else if (line.startsWith('**Explanation:**')) explanation = line.replace('**Explanation:**', '').trim();
      else if (line.startsWith('**Story Usage:**')) { story_usage = line.replace('**Story Usage:**', '').trim(); example_sentence = story_usage; }
      else if (line.startsWith('**Narrative Connection:**')) narrative_connection = line.replace('**Narrative Connection:**', '').trim();
    }
    if (grammar_point && explanation) {
      grammarItems.push({ grammar_point, label, explanation, story_usage, narrative_connection, example_sentence });
    } else if (point) {
      console.warn('[SRS] Unmatched grammar point:', point);
    }
  }
  return grammarItems;
} 