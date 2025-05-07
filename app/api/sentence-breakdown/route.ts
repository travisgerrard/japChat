import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/client';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface BreakdownJSON {
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
}

export const runtime = 'edge';

async function generateBreakdownJSON(sentence: string): Promise<BreakdownJSON> {
  if (!OPENAI_API_KEY) throw new Error('Missing OpenAI API key');
  const prompt = `Break down the following Japanese sentence in detail for a language learner.\n\nFor each word or phrase, provide:\n- The original Japanese as it appears in the sentence (surface form)\n- The dictionary/base form in kanji (if applicable; otherwise repeat the surface form)\n- The hiragana reading of the base form\n- The romaji reading\n- The English meaning\n- A concise but clear grammatical explanation (1–3 sentences: explain the function, nuance, and usage in context, e.g., 'topic marker', 'direction particle', 'polite verb form', etc.)\n\nAfter the breakdown, provide a plain English translation of the sentence.\n\nRespond ONLY with valid JSON in this format (no markdown, no explanation):\n{\n  \"breakdown\": [\n    {\n      \"japanese\": \"...\",\n      \"kanji\": \"...\",\n      \"reading\": \"...\",\n      \"romaji\": \"...\",\n      \"meaning\": \"...\",\n      \"explanation\": \"...\"\n    }\n  ],\n  \"translation\": \"...\"\n}\n\nSentence: ${sentence}`;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful Japanese language tutor.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    }),
  });
  if (!response.ok) throw new Error('OpenAI API error');
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim() || '';
  try {
    // Try to parse as JSON
    return JSON.parse(content) as BreakdownJSON;
  } catch {
    // Fallback: return as valid BreakdownJSON with fallback_markdown
    return {
      breakdown: [],
      translation: '',
      fallback_markdown: content,
    };
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { chat_message_id, sentence_idx, sentence_text } = body;
  if (!chat_message_id || typeof sentence_idx !== 'number' || !sentence_text) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const supabase = createClient();
  // 1. Check for existing breakdown
  const { data: existing, error: fetchError } = await supabase
    .from('sentence_breakdowns')
    .select('breakdown')
    .eq('chat_message_id', chat_message_id)
    .eq('sentence_idx', sentence_idx)
    .maybeSingle();
  if (existing && existing.breakdown) {
    // Try to parse as JSON, fallback to markdown
    try {
      const parsed = JSON.parse(existing.breakdown);
      return NextResponse.json({ breakdown: parsed });
    } catch {
      return NextResponse.json({ breakdown: existing.breakdown });
    }
  }
  // 2. Generate breakdown (OpenAI)
  let breakdown: BreakdownJSON;
  try {
    breakdown = await generateBreakdownJSON(sentence_text);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to generate breakdown' }, { status: 500 });
  }
  // 3. Save to DB (as JSON string)
  const { error: insertError } = await supabase.from('sentence_breakdowns').insert({
    chat_message_id,
    sentence_idx,
    sentence_text,
    breakdown: JSON.stringify(breakdown),
  });
  if (insertError) {
    // Still return breakdown, but log error
    console.error('[Daddy Long Legs] Failed to save breakdown:', insertError);
  }
  // 4. Return breakdown
  return NextResponse.json({ breakdown });
} 