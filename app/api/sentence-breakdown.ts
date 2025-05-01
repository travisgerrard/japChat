import { createClient } from '@/lib/supabase/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function generateBreakdown(sentence: string): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('Missing OpenAI API key');
  const prompt = `Break down the following Japanese sentence into its grammatical parts, provide a word-by-word gloss, and a plain English translation. Format as markdown.\n\nSentence: ${sentence}`;
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { chat_message_id, sentence_idx, sentence_text } = req.body;
  if (!chat_message_id || typeof sentence_idx !== 'number' || !sentence_text) {
    return res.status(400).json({ error: 'Missing required fields' });
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
    return res.status(200).json({ breakdown: existing.breakdown });
  }
  // 2. Generate breakdown (OpenAI)
  let breakdown: string;
  try {
    breakdown = await generateBreakdown(sentence_text);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to generate breakdown' });
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
  return res.status(200).json({ breakdown });
} 