import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Streams a story from OpenAI with memory (chat history) and returns a ReadableStream and the full text.
 */
export function streamStoryWithMemory({
  systemPrompt,
  chatHistory,
  userPrompt,
  aiMessageId,
}: {
  systemPrompt: string;
  chatHistory: ChatMessage[];
  userPrompt: string;
  aiMessageId: string;
}): ReadableStream<Uint8Array> {
  const response = streamText({
    model: openai('gpt-4o-mini'),
    messages: [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: userPrompt },
    ],
  });
  const encoder = new TextEncoder();
  let fullText = '';
  return new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(JSON.stringify({ id: aiMessageId }) + '\n'));
      for await (const chunk of response.textStream) {
        fullText += chunk;
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

/**
 * Calls OpenAI to generate a JSON block from the given markdown story.
 * Returns the full streamed JSON text as a string.
 */
export async function generateStoryJsonFromMarkdown(fullText: string): Promise<string> {
  const jsonPrompt = `You are a Japanese language teaching assistant.\nGiven a Japanese story and its English translation, extract vocabulary and grammar points for language learners.\nReturn your response as a single JSON object with the following structure and requirements:\n\n---\n\nJSON Structure:\n\n{\n  \"title\": \"<Story Title>\",\n  \"japanese_text\": \"<Full Japanese Story Text>\",\n  \"english_text\": \"<Full English Translation>\",\n  \"vocab_notes\": [\n    {\n      \"word\": \"<Vocabulary word (kanji or kana)>\",\n      \"kanji\": \"<Kanji breakdown: each kanji, its reading in parentheses, and stroke counts in parentheses, joined by +. Example: 美(び) (6, 6) + 味(あじ) (6, 6)>\",\n      \"reading\": \"<Full reading in hiragana/katakana>\",\n      \"meaning\": \"<English meaning>\",\n      \"context_sentence\": \"<A sentence from the story where the word appears in context. Do not create new sentences.>\"\n    }\n    // ...more vocab items\n  ],\n  \"grammar_notes\": [\n    {\n      \"grammar_point\": \"<Grammar point>\",\n      \"label\": \"<Short English label>\",\n      \"explanation\": \"<Brief explanation in English>\",\n      \"story_usage\": \"<A sentence from the story where this grammar point is used>\",\n      \"narrative_connection\": \"<How this grammar point is used in the story>\",\n      \"example_sentence\": \"<A simple example sentence in Japanese using this grammar point>\"\n    }\n    // ...more grammar items\n  ],\n  \"questions\": [\n    \"<Comprehension question in Japanese>\",\n    // ...more questions\n  ],\n  \"usage_tips\": [\n    \"<Tip for using a vocab or grammar point in conversation>\",\n    // ...more tips\n  ]\n}\n\n---\n\nSpecial Instructions:\n- For each vocab item:\n  - kanji: Break down the word into its kanji components. For each kanji, show the kanji character, its reading in parentheses, and stroke counts in parentheses (use the format (X, X); if you don't know the actual stroke count, use (6, 6) as a placeholder). Join multiple kanji with +. Example: \"美(び) (6, 6) + 味(あじ) (6, 6)\"\n  - context_sentence: Must be a sentence from the provided story text where the word appears. Do not create new sentences.\n- For each grammar point:\n  - story_usage: Must be a sentence from the story where the grammar point is used.\n- All fields must be present and non-empty unless otherwise specified.\n- The JSON must be valid and parseable.\n\nMarkdown:\n\n${fullText}\n\nOutput ONLY the JSON code block, wrapped in triple backticks (\`\`\`json ... \`\`\`). Do not include any explanation or text before or after the code block. Ensure grammar_notes uses the exact field names: grammar_point, label, explanation, story_usage, narrative_connection, example_sentence.`;
  const jsonResponse = await streamText({
    model: openai('gpt-4o-mini'),
    messages: [
      { role: 'system', content: jsonPrompt },
    ],
  });
  let jsonText = '';
  for await (const chunk of jsonResponse.textStream) {
    jsonText += chunk;
  }
  return jsonText;
} 