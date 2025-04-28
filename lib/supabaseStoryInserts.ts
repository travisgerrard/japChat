import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { extractSentences } from './extractSentences';
import { tokenizeWords } from './tokenizeWords';

function getSupabase(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey);
}

// Insert a sentence, return its ID
export async function insertSentence(text: string): Promise<number> {
  const supabase = getSupabase();
  // Check if sentence exists
  const { data: existing } = await supabase
    .from('sentences')
    .select('id')
    .eq('text', text)
    .maybeSingle();
  if (existing) return existing.id;
  // Insert new
  const { data, error } = await supabase
    .from('sentences')
    .insert([{ text }])
    .select('id')
    .single();
  if (error || !data) throw error || new Error('Failed to insert sentence');
  return data.id;
}

// Insert a word, return its ID
export async function insertWord(text: string, reading: string): Promise<number> {
  const supabase = getSupabase();
  // Check if word exists
  const { data: existing } = await supabase
    .from('words')
    .select('id')
    .eq('text', text)
    .eq('reading', reading)
    .maybeSingle();
  if (existing) return existing.id;
  // Insert new
  const { data, error } = await supabase
    .from('words')
    .insert([{ text, reading }])
    .select('id')
    .single();
  if (error || !data) throw error || new Error('Failed to insert word');
  return data.id;
}

// Link a sentence and word at a given index
export async function linkSentenceWord(sentenceId: number, wordId: number, idx: number): Promise<void> {
  const supabase = getSupabase();
  // Check if link exists
  const { data: existing } = await supabase
    .from('sentence_words')
    .select('sentence_id')
    .eq('sentence_id', sentenceId)
    .eq('word_id', wordId)
    .maybeSingle();
  if (existing) return;
  // Insert new link
  const { error } = await supabase
    .from('sentence_words')
    .insert([{ sentence_id: sentenceId, word_id: wordId, idx }]);
  if (error) throw error;
}

// Orchestrator
export async function processStory(story: string) {
  const sentences = extractSentences(story);
  for (const sentence of sentences) {
    const sentenceId = await insertSentence(sentence);
    const words = tokenizeWords(sentence);
    for (let idx = 0; idx < words.length; idx++) {
      const word = words[idx];
      // For MVP, use the word itself as the reading
      const wordId = await insertWord(word, word);
      await linkSentenceWord(sentenceId, wordId, idx);
    }
  }
} 