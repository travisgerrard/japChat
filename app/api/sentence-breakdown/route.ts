import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function generateBreakdown(sentence: string): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('Missing OpenAI API key');
  const prompt = `Break down the following Japanese sentence in detail for a language learner. For each word or phrase, provide:\n- The original Japanese (with furigana in parentheses if present)\n- The romaji\n- The English meaning\n- A well-thought-out, thorough grammatical explanation (not brief; explain the function, nuance, and usage in context, e.g., "topic marker", "direction particle", "polite verb form", etc.)\n\nAfter the breakdown, provide a plain English translation.\n\nFormat as markdown, using a bulleted list for the breakdown, and bold the Japanese word/phrase.\n\nSentence: ${sentence}`;
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
      max_tokens: 600,
      temperature: 0.3,
    }),
  });
  if (!response.ok) throw new Error('OpenAI API error');
  const data = await response.json();
  const breakdown = data.choices?.[0]?.message?.content?.trim() || 'No breakdown available.';
  return breakdown;
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
    return NextResponse.json({ breakdown: existing.breakdown });
  }
  // 2. Generate breakdown (OpenAI)
  let breakdown: string;
  try {
    breakdown = await generateBreakdown(sentence_text);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to generate breakdown' }, { status: 500 });
  }
  // 3. Save to DB
  const { error: insertError } = await supabase.from('sentence_breakdowns').insert({
    chat_message_id,
    sentence_idx,
    sentence_text,
    breakdown,
  });
  if (insertError) {
    // Still return breakdown, but log error
    console.error('[Daddy Long Legs] Failed to save breakdown:', insertError);
  }
  // 4. Return breakdown
  return NextResponse.json({ breakdown });
} 