import { supabaseAdmin } from '../../lib/supabase/admin';
import { v4 as uuidv4 } from 'uuid';

/**
 * Inserts a chat message (user or app_response) into the chat_messages table.
 */
export async function insertChatMessage({
  id,
  user_id,
  message_type,
  content,
  chat_message_id,
}: {
  id: string;
  user_id: string;
  message_type: string;
  content: string;
  chat_message_id?: string;
}): Promise<void> {
  const { error } = await supabaseAdmin.from('chat_messages').insert({
    id,
    user_id,
    message_type,
    content,
    chat_message_id,
  });
  if (error) throw error;
}

/**
 * Inserts a vocabulary item into the vocabulary table.
 */
export async function insertVocabulary({
  user_id,
  word,
  kanji,
  reading,
  meaning,
  context_sentence,
  chat_message_id,
  srs_level = 0,
  next_review,
}: {
  user_id: string;
  word: string;
  kanji?: string;
  reading: string;
  meaning: string;
  context_sentence?: string;
  chat_message_id: string;
  srs_level?: number;
  next_review: Date;
}): Promise<void> {
  const { error } = await supabaseAdmin.from('vocabulary').insert({
    id: uuidv4(),
    user_id,
    word,
    kanji,
    reading,
    meaning,
    context_sentence,
    chat_message_id,
    srs_level,
    next_review,
  });
  if (error) throw error;
}

/**
 * Inserts a vocab context/example into vocab_story_links.
 */
export async function insertVocabStoryLink({
  user_id,
  vocab_word,
  example_sentence,
  chat_message_id,
}: {
  user_id: string;
  vocab_word: string;
  example_sentence: string;
  chat_message_id: string;
}): Promise<void> {
  const { error } = await supabaseAdmin.from('vocab_story_links').insert({
    id: uuidv4(),
    user_id,
    vocab_word,
    example_sentence,
    chat_message_id,
    created_at: new Date(),
  });
  if (error) throw error;
}

/**
 * Inserts a grammar point into the grammar table.
 */
export async function insertGrammar({
  user_id,
  grammar_point,
  label,
  explanation,
  story_usage,
  narrative_connection,
  example_sentence,
  chat_message_id,
  srs_level = 0,
  next_review,
}: {
  user_id: string;
  grammar_point: string;
  label?: string;
  explanation: string;
  story_usage?: string;
  narrative_connection?: string;
  example_sentence?: string;
  chat_message_id: string;
  srs_level?: number;
  next_review: Date;
}): Promise<void> {
  const { error } = await supabaseAdmin.from('grammar').insert({
    id: uuidv4(),
    user_id,
    grammar_point,
    label,
    explanation,
    story_usage,
    narrative_connection,
    example_sentence,
    chat_message_id,
    srs_level,
    next_review,
  });
  if (error) throw error;
}

/**
 * Inserts a grammar context/example into grammar_story_links.
 */
export async function insertGrammarStoryLink({
  user_id,
  grammar_point,
  example_sentence,
  chat_message_id,
}: {
  user_id: string;
  grammar_point: string;
  example_sentence: string;
  chat_message_id: string;
}): Promise<void> {
  const { error } = await supabaseAdmin.from('grammar_story_links').insert({
    id: uuidv4(),
    user_id,
    grammar_point,
    example_sentence,
    chat_message_id,
    created_at: new Date(),
  });
  if (error) throw error;
}

/**
 * Inserts a story into the stories table.
 */
export async function insertStory({
  id,
  user_id,
  title,
  japanese_text,
  english_text,
  chat_message_id,
  created_at,
  level = 1,
}: {
  id: string;
  user_id: string;
  title: string;
  japanese_text: string;
  english_text: string;
  chat_message_id: string;
  created_at: Date;
  level?: number;
}): Promise<void> {
  const { error } = await supabaseAdmin.from('stories').insert({
    id,
    user_id,
    title,
    japanese_text,
    english_text,
    chat_message_id,
    created_at,
    level,
  });
  if (error) throw error;
} 