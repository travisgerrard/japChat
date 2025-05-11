import { useState, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

// Inline ChatMessage type
interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  role: string;
  created_at: string;
  app_response?: string;
}

export function useWordScores(message: ChatMessage | null, supabase: SupabaseClient) {
  const [existingScores, setExistingScores] = useState<Record<number, number>>({});
  const [bestAttempts, setBestAttempts] = useState<Record<number, { transcript: string, similarity: number }>>({});

  async function refetchScores() {
    if (!message || !message.user_id) return;
    const { data, error } = await supabase
      .from('word_scores')
      .select('sentence_idx, similarity, recognized_transcript')
      .eq('user_id', message.user_id)
      .eq('chat_message_id', message.id);
    if (!error && data) {
      const best: Record<number, number> = {};
      const bestAtt: Record<number, { transcript: string, similarity: number }> = {};
      for (const row of data) {
        if (
          best[row.sentence_idx] === undefined ||
          row.similarity > best[row.sentence_idx]
        ) {
          best[row.sentence_idx] = row.similarity;
          bestAtt[row.sentence_idx] = {
            transcript: row.recognized_transcript,
            similarity: row.similarity,
          };
        }
      }
      setExistingScores(best);
      setBestAttempts(bestAtt);
    }
  }

  useEffect(() => {
    refetchScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, supabase]);

  return {
    existingScores,
    bestAttempts,
    refetchScores,
    setExistingScores,
    setBestAttempts,
  };
} 