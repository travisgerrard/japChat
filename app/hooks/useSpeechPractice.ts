import { useState, useRef } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { normalizeToHiragana } from '../../app/util/jisho';
import { computeSimilarity } from '../../lib/japaneseUtils';
import type { SupabaseClient } from '@supabase/supabase-js';

// Minimal SpeechRecognition type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any;

// Inline ChatMessage type
interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  role: string;
  created_at: string;
  app_response?: string;
}

export function useSpeechPractice(
  sentences: string[],
  message: ChatMessage,
  supabase: SupabaseClient
) {
  const [audioBlobs, setAudioBlobs] = useState<(Blob | null)[]>([]);
  const [audioUrls, setAudioUrls] = useState<(string | null)[]>([]);
  const [recognizing, setRecognizing] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const stopRecordingRef = useRef(false);
  const [recordingIdx, setRecordingIdx] = useState<number | null>(null);
  const recordingIdxRef = useRef<number | null>(null);
  const [recognizedSentences, setRecognizedSentences] = useState<string[]>([]);
  const [similarities, setSimilarities] = useState<(number | null)[]>([]);

  // Keep ref in sync with state
  recordingIdxRef.current = recordingIdx;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audioRecorder = useAudioRecorder((blob: any, url: any) => {
    const idx = recordingIdxRef.current;
    if (idx !== null) {
      setAudioBlobs(prev => {
        const arr = [...prev];
        arr[idx] = blob;
        return arr;
      });
      setAudioUrls(prev => {
        const arr = [...prev];
        arr[idx] = url;
        return arr;
      });
      setRecordingIdx(null);
      recordingIdxRef.current = null;
    }
  });

  function getSpeechRecognition(): SpeechRecognitionType | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return SpeechRecognition ? new SpeechRecognition() : null;
  }

  async function handleRecordSentence(idx: number) {
    if (recognizing) {
      if (!stopRecordingRef.current) {
        stopRecordingRef.current = true;
        recognitionRef.current?.stop();
        audioRecorder.stop();
        setRecognizing(false);
      }
      return;
    }
    stopRecordingRef.current = false;
    const recognition = getSpeechRecognition();
    if (!recognition) {
      alert('Speech Recognition is not supported in this browser.');
      return;
    }
    recognition.lang = 'ja-JP';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = async (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        interimTranscript += event.results[i][0].transcript;
      }
      setRecognizedSentences(prev => {
        const arr = [...prev];
        arr[idx] = interimTranscript;
        return arr;
      });
      if (event.results[event.results.length - 1].isFinal) {
        const similarity = await computeSimilarity(interimTranscript, sentences[idx], normalizeToHiragana);
        setSimilarities(prev => {
          const arr = [...prev];
          arr[idx] = similarity;
          return arr;
        });
        // Save to Supabase word_scores only if new similarity is better
        if (message && message.user_id && message.id) {
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
            if (similarity > bestSimilarity) {
              await supabase.from('word_scores').upsert([
                {
                  user_id: message.user_id,
                  chat_message_id: message.id,
                  sentence_idx: idx,
                  similarity,
                  recognized_transcript: interimTranscript,
                }
              ], { onConflict: 'user_id,chat_message_id,sentence_idx' });
            }
          } catch (e) {
            // Handle error
          }
        }
        setRecognizing(false);
        audioRecorder.stop();
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error === 'aborted') {
        setRecognizing(false);
        audioRecorder.stop();
        return;
      }
      setRecognizing(false);
      audioRecorder.stop();
    };
    recognition.onend = () => {
      if (!stopRecordingRef.current) {
        stopRecordingRef.current = true;
        audioRecorder.stop();
      }
      setRecognizing(false);
    };
    recognitionRef.current = recognition;
    setRecognizing(true);
    setRecordingIdx(idx);
    audioRecorder.start();
    recognition.start();
  }

  return {
    audioBlobs,
    audioUrls,
    recognizing,
    recordingIdx,
    recognizedSentences,
    similarities,
    handleRecordSentence,
    setRecordingIdx,
    setRecognizedSentences,
    setSimilarities,
    setAudioBlobs,
    setAudioUrls,
  };
} 