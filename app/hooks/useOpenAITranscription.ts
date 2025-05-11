import { useState } from 'react';
import { computeSimilarity } from '../../lib/japaneseUtils';
import { normalizeToHiragana } from '../../app/util/jisho';
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

export function useOpenAITranscription(
  sentences: string[],
  audioBlobs: (Blob | null)[],
  message: ChatMessage,
  supabase: SupabaseClient,
  refetchScores: () => void
) {
  const [openaiTranscriptions, setOpenaiTranscriptions] = useState<(string | null)[]>([]);
  const [openaiLoading, setOpenaiLoading] = useState<boolean[]>([]);
  const [openaiSimilarities, setOpenaiSimilarities] = useState<(number | null)[]>([]);

  async function analyzeWithOpenAI(idx: number) {
    if (!audioBlobs[idx]) return;
    setOpenaiLoading(prev => {
      const arr = [...prev];
      arr[idx] = true;
      return arr;
    });
    const formData = new FormData();
    formData.append('audio', audioBlobs[idx]!);
    formData.append('target', sentences[idx]);
    const res = await fetch('/api/analyze-audio', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    setOpenaiTranscriptions(prev => {
      const arr = [...prev];
      arr[idx] = data.transcription || null;
      return arr;
    });
    // Compute similarity for OpenAI transcription
    let openaiSim: number | null = null;
    if (data.transcription) {
      openaiSim = await computeSimilarity(data.transcription, sentences[idx], normalizeToHiragana);
    }
    setOpenaiSimilarities(prev => {
      const arr = [...prev];
      arr[idx] = openaiSim;
      return arr;
    });
    // Save OpenAI similarity if it's higher than the in-browser similarity
    if (openaiSim != null && message && message.user_id && message.id) {
      try {
        const { data: bestRows } = await supabase
          .from('word_scores')
          .select('similarity')
          .eq('user_id', message.user_id)
          .eq('chat_message_id', message.id)
          .eq('sentence_idx', idx)
          .order('similarity', { ascending: false })
          .limit(1);
        const bestSimilarity = bestRows?.[0]?.similarity ?? 0;
        if (openaiSim > bestSimilarity) {
          await supabase.from('word_scores').upsert([
            {
              user_id: message.user_id,
              chat_message_id: message.id,
              sentence_idx: idx,
              similarity: openaiSim,
              recognized_transcript: data.transcription,
            }
          ], { onConflict: 'user_id,chat_message_id,sentence_idx' });
          refetchScores();
        }
      } catch (e) {
        // Handle error
      }
    }
    setOpenaiLoading(prev => {
      const arr = [...prev];
      arr[idx] = false;
      return arr;
    });
  }

  return {
    openaiTranscriptions,
    openaiLoading,
    openaiSimilarities,
    analyzeWithOpenAI,
    setOpenaiTranscriptions,
    setOpenaiSimilarities,
    setOpenaiLoading,
  };
} 