'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { tokenizeWords } from '../../../lib/tokenizeWords';
import { fetchJishoReading, normalizeToHiragana } from '../../util/jisho';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import ReactMarkdown from 'react-markdown';
// import Kuroshiro from 'kuroshiro';
// import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  role: string;
  created_at: string;
  app_response?: string;
}

function extractSections(markdown: string) {
  // More robust extraction: allow for --- or ### or end of string as section boundaries
  const jpMatch = markdown.match(/### Japanese Text\s*\n+([\s\S]+?)(?:\n###|\n---|$)/);
  const enMatch = markdown.match(/### English Translation\s*\n+([\s\S]+?)(?:\n###|\n---|$)/);
  return {
    japanese: jpMatch ? jpMatch[1].trim() : '',
    english: enMatch ? enMatch[1].trim() : '',
  };
}

function stripFurigana(text: string) {
  // Remove furigana in the form 漢字(かんじ)
  return text.replace(/\([^)]+\)/g, '');
}

function splitSentences(text: string) {
  // Avoid splitting inside Japanese quotes (「」 and 『』)
  // We'll split only on 。！？ that are not inside quotes
  const sentences: string[] = [];
  let current = '';
  let quoteLevel = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '「' || char === '『') quoteLevel++;
    if (char === '」' || char === '』') quoteLevel = Math.max(0, quoteLevel - 1);
    current += char;
    if ((char === '。' || char === '！' || char === '？') && quoteLevel === 0) {
      sentences.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) sentences.push(current.trim());
  return sentences.filter(Boolean);
}

function normalizeForSimilarity(text: string) {
  // Remove punctuation, whitespace, and all quote marks (Japanese and Western)
  return text
    .replace(/[\s\u3000]/g, '') // Remove all spaces (ASCII and Japanese)
    .replace(/[。、．，,.!！?？「」『』"']/g, '') // Remove common punctuation and quotes
    .replace(/[\uFF01-\uFF5E]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)) // Full-width to half-width
    .toLowerCase();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

async function computeSimilarity(a: string, b: string): Promise<number> {
  // Normalize both strings to hiragana
  const [normA, normB] = await Promise.all([
    normalizeToHiragana(a),
    normalizeToHiragana(b)
  ]);
  if (!normA || !normB) return 0;
  // Further normalize: trim, remove punctuation, unify unicode
  const normedA = normalizeForSimilarity(normA);
  const normedB = normalizeForSimilarity(normB);
  const dist = levenshtein(normedA, normedB);
  const maxLen = Math.max(normedA.length, normedB.length);
  if (maxLen === 0) return 100;
  return Math.round(100 * (1 - dist / maxLen));
}

// TypeScript: Add minimal SpeechRecognition types for browser compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any;
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}

// --- Breakdown Parsing Helper ---
type BreakdownItem = {
  word: string;
  reading: string;
  romaji: string;
  meaning: string;
  explanation: string;
};

function parseBreakdown(markdown: string): BreakdownItem[] {
  const lines = markdown.split(/\r?\n/);
  const items: BreakdownItem[] = [];
  let current: BreakdownItem | null = null;
  for (const line of lines) {
    if (/^- \*\*(.+?)\*\*/.test(line)) {
      if (current) items.push(current);
      const wordMatch = line.match(/^- \*\*(.+?)\*\*(?: \((.+?)\))?/);
      current = {
        word: wordMatch?.[1]?.trim() || '',
        reading: wordMatch?.[2]?.trim() || '',
        romaji: '',
        meaning: '',
        explanation: '',
      };
    } else if (/^\s*- Romaji:/.test(line) && current) {
      current.romaji = line.replace(/^- Romaji:/, '').trim();
    } else if (/^\s*- English meaning:/.test(line) && current) {
      current.meaning = line.replace(/^- English meaning:/, '').trim();
    } else if (/^\s*- Grammatical explanation:/.test(line) && current) {
      current.explanation = line.replace(/^- Grammatical explanation:/, '').trim();
    }
  }
  if (current) items.push(current);
  return items;
}

// --- Inline Modal Component ---
function InlineModal({ open, onClose, children }: { open: boolean, onClose: () => void, children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-lg w-full">
        {children}
        <div className="mt-4 flex justify-end">
          <button className="px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded mr-2" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function SpeakPage() {
  const params = useParams() ?? {};
  const chat_message_id = (params as { chat_message_id?: string }).chat_message_id as string;
  const [message, setMessage] = useState<ChatMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const supabase = createClient();
  const [showTranslation, setShowTranslation] = useState(false);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState<number | null>(null);
  const ttsUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const ttsActiveRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [jaVoice, setJaVoice] = useState<SpeechSynthesisVoice | null>(null);
  // Sentence-level recording state
  const [recordingIdx, setRecordingIdx] = useState<number | null>(null);
  const [recognizedSentences, setRecognizedSentences] = useState<string[]>([]);
  const [similarities, setSimilarities] = useState<(number | null)[]>([]);
  // Add state for existing word scores
  const [existingScores, setExistingScores] = useState<Record<number, number>>({});
  // Add state for best recognized transcript and similarity per sentence
  const [bestAttempts, setBestAttempts] = useState<Record<number, { transcript: string, similarity: number }>>({});
  // Add state for last recording per sentence
  const [audioBlobs, setAudioBlobs] = useState<(Blob | null)[]>([]);
  const [audioUrls, setAudioUrls] = useState<(string | null)[]>([]);
  const recordingIdxRef = useRef<number | null>(null);
  const stopRecordingRef = useRef(false);
  // Add after other state declarations
  const [hiragana, setHiragana] = useState<(string | null)[]>([]);
  const [hiraganaLoading, setHiraganaLoading] = useState<boolean[]>([]);
  // Add state for OpenAI similarity per sentence
  const [openaiSimilarities, setOpenaiSimilarities] = useState<(number | null)[]>([]);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [isPaused, setIsPaused] = useState(false);
  // State for sentence breakdowns
  const [breakdowns, setBreakdowns] = useState<(string | null)[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState<boolean[]>([]);
  const [breakdownVisible, setBreakdownVisible] = useState<boolean[]>([]);
  const [hiraganaVisible, setHiraganaVisible] = useState<boolean[]>([]);
  // Add state for modal
  const [modal, setModal] = useState<{ type: 'vocab' | 'grammar', item: BreakdownItem, existing: Record<string, unknown> | null } | null>(null);
  const [saving, setSaving] = useState(false);

  // Keep ref in sync with state
  useEffect(() => {
    recordingIdxRef.current = recordingIdx;
  }, [recordingIdx]);

  const audioRecorder = useAudioRecorder((blob, url) => {
    const idx = recordingIdxRef.current;
    console.log('[Daddy Long Legs] (callback) recordingIdxRef.current:', idx);
    if (idx !== null) {
      setAudioBlobs(prev => {
        const arr = [...prev];
        arr[idx] = blob;
        console.log('[Daddy Long Legs] (callback) Set audioBlob for idx', idx, blob);
        return arr;
      });
      setAudioUrls(prev => {
        const arr = [...prev];
        arr[idx] = url;
        console.log('[Daddy Long Legs] (callback) Set audioUrl for idx', idx, url);
        return arr;
      });
      setRecordingIdx(null);
      recordingIdxRef.current = null;
    } else {
      console.warn('[Daddy Long Legs] (callback) recordingIdxRef.current is null!');
    }
  });

  // Add state for OpenAI transcription per sentence
  const [openaiTranscriptions, setOpenaiTranscriptions] = useState<(string | null)[]>([]);
  const [openaiLoading, setOpenaiLoading] = useState<(boolean)[]>([]);

  useEffect(() => {
    async function fetchMessage() {
      setLoading(true);
      setError(null);
      if (chat_message_id === 'test') {
        // Return a mock message for local testing
        setMessage({
          id: 'test',
          user_id: 'test-user',
          content: '### Japanese Text\nこんにちは、世界！\n\n### English Translation\nHello, world!',
          role: 'user',
          created_at: new Date().toISOString(),
          app_response: 'This is a mock app response for testing.'
        });
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('id', chat_message_id)
        .maybeSingle();
      console.log('[SpeakPage] Supabase fetch', { data, error, chat_message_id });
      if (error || !data || !data.content) {
        setError('Message not found');
        setLoading(false);
        return;
      }
      setMessage(data);
      setLoading(false);
    }
    if (chat_message_id) fetchMessage();
  }, [chat_message_id, supabase]);

  // Load voices and select best Japanese voice
  useEffect(() => {
    function updateVoices() {
      const allVoices = window.speechSynthesis.getVoices();
      // Prefer kyokoEnhanced, then kyoko, then any ja-JP
      const kyokoEnhanced = allVoices.find(v => v.name?.toLowerCase().includes('kyokoenhanced'));
      const kyoko = allVoices.find(v => v.name?.toLowerCase() === 'kyoko');
      const ja = allVoices.find(v => v.lang?.toLowerCase().startsWith('ja')) || null;
      setJaVoice(kyokoEnhanced || kyoko || ja || null);
    }
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, []);

  // Track speaking state
  useEffect(() => {
    const handleStart = () => setIsSpeaking(true);
    const handleEnd = () => {
      setIsSpeaking(false);
      setCurrentSentenceIdx(null);
    };
    window.speechSynthesis.addEventListener('start', handleStart);
    window.speechSynthesis.addEventListener('end', handleEnd);
    window.speechSynthesis.addEventListener('cancel', handleEnd);
    return () => {
      window.speechSynthesis.removeEventListener('start', handleStart);
      window.speechSynthesis.removeEventListener('end', handleEnd);
      window.speechSynthesis.removeEventListener('cancel', handleEnd);
    };
  }, []);

  // Update refetchScores to also fetch recognized_transcript
  async function refetchScores() {
    if (!message || !message.user_id) return;
    const { data, error } = await supabase
      .from('word_scores')
      .select('sentence_idx, similarity, recognized_transcript')
      .eq('user_id', message.user_id)
      .eq('chat_message_id', message.id);
    console.log('[DEBUG][Daddy Long Legs] word_scores fetched:', data, error);
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

  // Replace fetchScores useEffect with:
  useEffect(() => {
    refetchScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, supabase]);

  if (loading) return <div className="max-w-xl mx-auto p-8">Loading...</div>;
  if (error) return <div className="max-w-xl mx-auto p-8 text-red-500">{error}</div>;

  // Only parse after message is loaded
  const { japanese, english } = extractSections(message?.content ?? "");
  const japaneseNoFurigana = stripFurigana(japanese);
  const sentences = splitSentences(japaneseNoFurigana);

  function handlePlay() {
    if (!sentences.length) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    setIsPaused(false);
    ttsUtterancesRef.current = sentences.map((sentence, idx) => {
      if (!sentence.trim()) return null;
      const utter = new window.SpeechSynthesisUtterance(sentence);
      utter.lang = 'ja-JP';
      if (jaVoice) utter.voice = jaVoice;
      utter.rate = speechRate;
      utter.onstart = () => setCurrentSentenceIdx(idx);
      utter.onend = () => {
        if (idx === sentences.length - 1) setCurrentSentenceIdx(null);
      };
      return utter;
    }).filter(Boolean) as SpeechSynthesisUtterance[];
    ttsActiveRef.current = true;
    for (const utter of ttsUtterancesRef.current) {
      window.speechSynthesis.speak(utter);
    }
  }

  function handlePause() {
    window.speechSynthesis.pause();
    setIsPaused(true);
  }

  function handleResume() {
    window.speechSynthesis.resume();
    setIsPaused(false);
  }

  function handleStop() {
    window.speechSynthesis.cancel();
    setCurrentSentenceIdx(null);
    ttsActiveRef.current = false;
    setIsSpeaking(false);
    setIsPaused(false);
  }

  function getSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    return SpeechRecognition ? new SpeechRecognition() : null;
  }

  function handleRecordSentence(idx: number) {
    if (recognizing) {
      if (!stopRecordingRef.current) {
        stopRecordingRef.current = true;
        console.log('[Daddy Long Legs] handleRecordSentence: Stopping recording for idx', idx);
        recognitionRef.current?.stop();
        audioRecorder.stop();
        setRecognizing(false);
      } else {
        console.log('[Daddy Long Legs] handleRecordSentence: Stop already in progress for idx', idx);
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
    recognition.onresult = async (
      // @ts-expect-error: SpeechRecognitionEvent may not be defined in all browsers
      event
    ) => {
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
        const similarity = await computeSimilarity(interimTranscript, sentences[idx]);
        setSimilarities(prev => {
          const arr = [...prev];
          arr[idx] = similarity;
          return arr;
        });
        // Save to Supabase word_scores only if new similarity is better
        if (message && message.user_id && message.id) {
          try {
            // Fetch current best score for this sentence
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
              const { data: upsertData, error: upsertError } = await supabase.from('word_scores').upsert([
                {
                  user_id: message.user_id,
                  chat_message_id: message.id,
                  sentence_idx: idx,
                  similarity,
                  recognized_transcript: interimTranscript,
                }
              ], { onConflict: 'user_id,chat_message_id,sentence_idx' });
              console.log('[Daddy Long Legs] Upserted word_scores:', { user_id: message.user_id, chat_message_id: message.id, sentence_idx: idx, similarity, recognized_transcript: interimTranscript });
              if (upsertError) {
                console.error('[Daddy Long Legs] Supabase upsert error:', upsertError);
              } else {
                console.log('[Daddy Long Legs] Supabase upsert success:', upsertData);
              }
            } else {
              console.log('[Daddy Long Legs] Not upserting, similarity not improved:', { similarity, bestSimilarity });
            }
          } catch (e) {
            console.error('[Daddy Long Legs] JS Exception during upsert word_scores', e);
          }
        }
        setRecognizing(false);
        audioRecorder.stop();
        console.log('[Daddy Long Legs] Final result, stopped recording for idx', idx);
      }
    };
    recognition.onerror = (
      // @ts-expect-error: SpeechRecognitionErrorEvent may not be defined in all browsers
      event
    ) => {
      if (event.error === 'aborted') {
        setRecognizing(false);
        audioRecorder.stop();
        console.log('[Daddy Long Legs] Recording aborted for idx', idx);
        return;
      }
      setError('Speech recognition error: ' + event.error);
      setRecognizing(false);
      audioRecorder.stop();
      console.log('[Daddy Long Legs] Recording error for idx', idx, event.error);
    };
    recognition.onend = () => {
      if (!stopRecordingRef.current) {
        stopRecordingRef.current = true;
        console.log('[Daddy Long Legs] recognition.onend: Stopping recording for idx', idx);
        audioRecorder.stop();
      } else {
        console.log('[Daddy Long Legs] recognition.onend: Stop already in progress for idx', idx);
      }
      setRecognizing(false);
      console.log('[Daddy Long Legs] recognition.onend: Ended for idx', idx);
    };
    recognitionRef.current = recognition;
    setRecognizing(true);
    setRecordingIdx(idx);
    audioRecorder.start();
    console.log('[Daddy Long Legs] Started recording for idx', idx);
    recognition.start();
  }

  function handlePlaySentence(idx: number) {
    window.speechSynthesis.cancel();
    const sentence = sentences[idx];
    if (!sentence.trim()) return;
    const utter = new window.SpeechSynthesisUtterance(sentence);
    utter.lang = 'ja-JP';
    if (jaVoice) utter.voice = jaVoice;
    utter.rate = speechRate;
    utter.onstart = () => setCurrentSentenceIdx(idx);
    utter.onend = () => setCurrentSentenceIdx(null);
    window.speechSynthesis.speak(utter);
  }

  const speechSupported = typeof window !== 'undefined' && ((window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);

  // Add a function to get color for similarity
  function getSimilarityColor(score: number | null, isDark: boolean) {
    if (score === null) return '';
    if (score >= 85) return isDark ? 'text-lime-300 font-bold' : 'text-green-600 font-bold';
    if (score >= 60) return isDark ? 'text-yellow-300 font-semibold' : 'text-yellow-600 font-semibold';
    return isDark ? 'text-rose-400 font-semibold' : 'text-red-600 font-semibold';
  }

  // Detect dark mode
  const isDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

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
      openaiSim = await computeSimilarity(data.transcription, sentences[idx]);
    }
    setOpenaiSimilarities(prev => {
      const arr = [...prev];
      arr[idx] = openaiSim;
      return arr;
    });
    setOpenaiLoading(prev => {
      const arr = [...prev];
      arr[idx] = false;
      return arr;
    });
  }

  // Add handler to upsert OpenAI transcription as best attempt
  async function upsertOpenAIBest(idx: number) {
    if (!openaiTranscriptions[idx] || openaiSimilarities[idx] == null) return;
    if (!message || !message.user_id || !message.id) return;
    try {
      // Fetch current best score for this sentence
      const { data: bestRows } = await supabase
        .from('word_scores')
        .select('similarity')
        .eq('user_id', message.user_id)
        .eq('chat_message_id', message.id)
        .eq('sentence_idx', idx)
        .order('similarity', { ascending: false })
        .limit(1);
      const bestSimilarity = bestRows?.[0]?.similarity ?? 0;
      if (openaiSimilarities[idx]! > bestSimilarity) {
        const { data: upsertData, error: upsertError } = await supabase.from('word_scores').upsert([
          {
            user_id: message.user_id,
            chat_message_id: message.id,
            sentence_idx: idx,
            similarity: openaiSimilarities[idx],
            recognized_transcript: openaiTranscriptions[idx],
          }
        ], { onConflict: 'user_id,chat_message_id,sentence_idx' });
        console.log('[Daddy Long Legs] Upserted OpenAI word_scores:', { user_id: message.user_id, chat_message_id: message.id, sentence_idx: idx, similarity: openaiSimilarities[idx], recognized_transcript: openaiTranscriptions[idx] });
        if (upsertError) {
          console.error('[Daddy Long Legs] Supabase upsert error:', upsertError);
        } else {
          console.log('[Daddy Long Legs] Supabase upsert success:', upsertData);
        }
        // Refetch scores to update UI
        refetchScores();
      } else {
        console.log('[Daddy Long Legs] Not upserting OpenAI, similarity not improved:', { openaiSim: openaiSimilarities[idx], bestSimilarity });
      }
    } catch (e) {
      console.error('[Daddy Long Legs] JS Exception during upsert OpenAI word_scores', e);
    }
  }

  async function handleShowHiragana(idx: number) {
    if (hiragana[idx]) {
      setHiraganaVisible(prev => {
        const arr = [...prev];
        arr[idx] = !arr[idx];
        return arr;
      });
      return;
    }
    setHiraganaLoading(prev => {
      const arr = [...prev];
      arr[idx] = true;
      return arr;
    });
    const hira = await normalizeToHiragana(sentences[idx]);
    setHiragana(prev => {
      const arr = [...prev];
      arr[idx] = hira;
      return arr;
    });
    setHiraganaVisible(prev => {
      const arr = [...prev];
      arr[idx] = true;
      return arr;
    });
    setHiraganaLoading(prev => {
      const arr = [...prev];
      arr[idx] = false;
      return arr;
    });
  }

  async function fetchBreakdown(idx: number, sentence: string) {
    setBreakdownLoading(prev => {
      const arr = [...prev];
      arr[idx] = true;
      return arr;
    });
    try {
      const res = await fetch('/api/sentence-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_message_id, sentence_idx: idx, sentence_text: sentence }),
      });
      const data = await res.json();
      setBreakdowns(prev => {
        const arr = [...prev];
        arr[idx] = data.breakdown || 'No breakdown available.';
        return arr;
      });
      setBreakdownVisible(prev => {
        const arr = [...prev];
        arr[idx] = true;
        return arr;
      });
    } catch {
      setBreakdowns(prev => {
        const arr = [...prev];
        arr[idx] = 'Failed to fetch breakdown.';
        return arr;
      });
    } finally {
      setBreakdownLoading(prev => {
        const arr = [...prev];
        arr[idx] = false;
        return arr;
      });
    }
  }

  // --- Add to Vocab/Grammar Handlers ---
  async function handleAdd(type: 'vocab' | 'grammar', item: BreakdownItem) {
    setSaving(true);
    const table = type === 'vocab' ? 'words' : 'grammar';
    const key = type === 'vocab' ? 'word' : 'grammar_point';
    const value = item.word;
    const { data: existing } = await supabase
      .from(table)
      .select('*')
      .ilike(key, value);
    if (existing && existing.length > 0) {
      setModal({ type, item, existing: existing[0] });
      setSaving(false);
      return;
    }
    await supabase.from(table).insert(type === 'vocab' ? {
      word: item.word,
      reading: item.reading,
      meaning: item.meaning,
      romaji: item.romaji,
      // Add more fields as needed
    } : {
      grammar_point: item.word,
      explanation: item.explanation,
      // Add more fields as needed
    });
    setSaving(false);
    alert('Added!');
  }

  async function handleAddAnyway() {
    if (!modal) return;
    setSaving(true);
    const { type, item } = modal;
    const table = type === 'vocab' ? 'words' : 'grammar';
    await supabase.from(table).insert(type === 'vocab' ? {
      word: item.word,
      reading: item.reading,
      meaning: item.meaning,
      romaji: item.romaji,
    } : {
      grammar_point: item.word,
      explanation: item.explanation,
    });
    setSaving(false);
    setModal(null);
    alert('Added!');
  }

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh' }} className="pt-16">
      <div className="max-w-xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-6">
          Practice Speaking
          {sentences && sentences.length > 0 && (
            <span className="ml-4 text-lg font-normal text-gray-600 dark:text-gray-300 align-middle">
              ({Object.values(existingScores).filter(score => score >= 80).length} / {sentences.length} phrases completed ≥80%)
            </span>
          )}
        </h1>
        <div className="mb-4">
          <div className="font-semibold text-gray-700 mb-1">Story (Japanese):</div>
          <div className="bg-blue-50 dark:bg-blue-900 rounded p-4 prose prose-2xl dark:prose-invert mb-4">
            {/* Custom paragraph+sentence rendering with highlight */}
            {(() => {
              // Split into paragraphs (double newline or \n\n)
              const paragraphs = japanese.split(/\n\s*\n/);
              let globalIdx = 0;
              return paragraphs.map((para, pIdx) => {
                // Split paragraph into sentences
                const paraSentences = splitSentences(stripFurigana(para));
                return (
                  <p key={pIdx} className="mb-4">
                    {paraSentences.map((sentence, sIdx) => {
                      const idx = globalIdx;
                      globalIdx++;
                      return (
                        <span
                          key={sIdx}
                          className={
                            currentSentenceIdx === idx
                              ? 'bg-yellow-200 dark:bg-yellow-700 rounded px-1'
                              : ''
                          }
                        >
                          {sentence}
                        </span>
                      );
                    })}
                  </p>
                );
              });
            })()}
          </div>
          {/* Buttons and speech rate slider in a row */}
          <div className="flex gap-4 mt-4 items-center flex-wrap">
            {!isSpeaking ? (
              <button className="px-4 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600" onClick={handlePlay}>Play</button>
            ) : (
              <button className="px-4 py-2 bg-red-500 text-white rounded shadow hover:bg-red-600" onClick={handleStop}>Stop</button>
            )}
            {/* Pause/Resume button, only visible when speaking and not stopped */}
            {isSpeaking && !isPaused && (
              <button className="px-4 py-2 bg-yellow-500 text-white rounded shadow hover:bg-yellow-600" onClick={handlePause}>Pause</button>
            )}
            {isSpeaking && isPaused && (
              <button className="px-4 py-2 bg-green-500 text-white rounded shadow hover:bg-green-600" onClick={handleResume}>Resume</button>
            )}
            {english && (
              <button
                className="px-4 py-2 bg-gray-500 text-white rounded shadow hover:bg-gray-600"
                onClick={() => setShowTranslation((v) => !v)}
              >
                {showTranslation ? 'Hide Translation' : 'Show Translation'}
              </button>
            )}
            {/* Speech rate slider */}
            <div className="flex flex-col items-center ml-2">
              <label htmlFor="speech-rate-slider" className="font-medium whitespace-nowrap">Speed: <span className="font-mono">{speechRate.toFixed(2)}x</span></label>
              <input
                id="speech-rate-slider"
                type="range"
                min={0.5}
                max={1.0}
                step={0.01}
                value={speechRate}
                onChange={e => setSpeechRate(Number(e.target.value))}
                className="w-32 accent-blue-500"
              />
              <div className="text-xs text-gray-500 flex gap-2 w-32 justify-between">
                <span>Slow</span>
                <span>Normal</span>
              </div>
            </div>
          </div>
          {showTranslation && english && (
            <div className="mt-4">
              <div className="font-semibold text-gray-700 mb-1">English Translation:</div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded p-4 prose dark:prose-invert whitespace-pre-line">{english}</div>
            </div>
          )}
          {!speechSupported && (
            <div className="mt-4 text-red-500">Speech Recognition is not supported in this browser.</div>
          )}
        </div>
        {/* Sentence-by-sentence recording */}
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-2">Practice Each Sentence</h2>
          <ol className="space-y-4">
            {sentences.map((sentence, idx) => (
              <li key={idx} className={`rounded p-3 transition-all duration-200 border ${
                (currentSentenceIdx === idx || recordingIdx === idx)
                  ? isDark
                    ? 'bg-blue-800 border-blue-400 shadow-lg'
                    : 'bg-yellow-100 border-yellow-400'
                  : isDark
                    ? 'bg-gray-900 border-gray-700'
                    : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-lg">
                    {sentence}
                  </span>
                  <span className="text-xs text-gray-500">Sentence {idx + 1} of {sentences.length}</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <button
                    className={`px-3 py-1 rounded shadow text-white ${recordingIdx === idx && recognizing ? (isDark ? 'bg-yellow-400 text-gray-900' : 'bg-yellow-600') : (isDark ? 'bg-yellow-300 text-gray-900 hover:bg-yellow-400' : 'bg-yellow-500 hover:bg-yellow-600')}`}
                    onClick={() => handleRecordSentence(idx)}
                    disabled={!speechSupported || (recognizing && recordingIdx !== idx)}
                  >
                    {recordingIdx === idx && recognizing ? 'Listening...' : 'Record'}
                  </button>
                  <button
                    className={isDark ? 'px-3 py-1 rounded shadow text-white bg-blue-500 hover:bg-blue-400' : 'px-3 py-1 rounded shadow text-white bg-blue-500 hover:bg-blue-600'}
                    onClick={() => handlePlaySentence(idx)}
                  >
                    Play
                  </button>
                  <button
                    className="px-3 py-1 rounded shadow text-white bg-pink-500 hover:bg-pink-600"
                    onClick={() => handleShowHiragana(idx)}
                    disabled={hiraganaLoading[idx]}
                  >
                    {hiraganaLoading[idx]
                      ? 'Loading Hiragana...'
                      : hiragana[idx] && hiraganaVisible[idx]
                        ? 'Hide Hiragana'
                        : 'Show Hiragana'}
                  </button>
                  <button
                    className="px-3 py-1 rounded shadow text-white bg-cyan-600 hover:bg-cyan-700"
                    onClick={() => {
                      if (breakdowns[idx]) {
                        setBreakdownVisible(prev => {
                          const arr = [...prev];
                          arr[idx] = !arr[idx];
                          return arr;
                        });
                      } else {
                        fetchBreakdown(idx, sentence);
                      }
                    }}
                    disabled={breakdownLoading[idx]}
                  >
                    {breakdownLoading[idx] ? 'Loading...' : (breakdowns[idx] && breakdownVisible[idx] ? 'Hide Breakdown' : 'Breakdown')}
                  </button>
                </div>
                {/* Always show Best score if available */}
                {existingScores[idx] !== undefined && (
                  <span className="ml-2 text-xs text-green-700 dark:text-lime-300">Best: {existingScores[idx]}%</span>
                )}
                {/* Show best recognized transcript and similarity on reload */}
                {bestAttempts[idx] && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="text-sm text-gray-700 dark:text-gray-200">Recognized: <span className="font-semibold">{bestAttempts[idx].transcript}</span></div>
                    <div className={`text-xs ml-2 ${getSimilarityColor(bestAttempts[idx].similarity, isDark)}`}>Similarity: {bestAttempts[idx].similarity}%</div>
                    {bestAttempts[idx].similarity >= 85 && (
                      <span className={isDark ? 'ml-2 text-lime-300' : 'ml-2 text-green-600'}>✔️</span>
                    )}
                    {bestAttempts[idx].similarity < 60 && (
                      <span className={isDark ? 'ml-2 text-rose-400' : 'ml-2 text-red-600'}>❌</span>
                    )}
                  </div>
                )}
                {/* Show current recognized attempt if present (overrides best) */}
                {recognizedSentences[idx] && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="text-sm text-gray-700 dark:text-gray-200">Recognized: <span className="font-semibold">{recognizedSentences[idx]}</span></div>
                    {similarities[idx] !== null && (
                      <div className={`text-xs ml-2 ${getSimilarityColor(similarities[idx], isDark)}`}>Similarity: {similarities[idx]}%</div>
                    )}
                    {similarities[idx] !== null && similarities[idx]! >= 85 && (
                      <span className={isDark ? 'ml-2 text-lime-300' : 'ml-2 text-green-600'}>✔️</span>
                    )}
                    {similarities[idx] !== null && similarities[idx]! < 60 && (
                      <span className={isDark ? 'ml-2 text-rose-400' : 'ml-2 text-red-600'}>❌</span>
                    )}
                  </div>
                )}
                {audioUrls[idx] && (
                  <button
                    className="ml-2 px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-xs font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
                    onClick={() => {
                      console.log('[Daddy Long Legs] Playing audio for idx', idx, audioUrls[idx]);
                      const audio = new Audio(audioUrls[idx]!);
                      audio.play();
                    }}
                  >
                    Play My Recording
                  </button>
                )}
                {audioBlobs[idx] && (
                  <button
                    className="ml-2 px-2 py-1 bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200 rounded-full text-xs font-semibold hover:bg-purple-300 dark:hover:bg-purple-600"
                    onClick={() => analyzeWithOpenAI(idx)}
                    disabled={openaiLoading[idx]}
                  >
                    {openaiLoading[idx] ? 'Transcribing...' : 'Transcribe with OpenAI'}
                  </button>
                )}
                {openaiTranscriptions[idx] && (
                  <div className="mt-2 text-xs text-purple-700 dark:text-purple-300">
                    OpenAI Transcription: {openaiTranscriptions[idx]}
                    {openaiSimilarities[idx] != null && (
                      <span className={`ml-2 ${getSimilarityColor(openaiSimilarities[idx], isDark)}`}>Similarity: {openaiSimilarities[idx]}%</span>
                    )}
                    {/* Show button if OpenAI similarity is better than best */}
                    {openaiSimilarities[idx] != null && existingScores[idx] != null && openaiSimilarities[idx]! > existingScores[idx]! && (
                      <button
                        className="ml-2 px-2 py-1 bg-green-200 dark:bg-green-700 text-green-800 dark:text-green-200 rounded-full text-xs font-semibold hover:bg-green-300 dark:hover:bg-green-600"
                        onClick={() => upsertOpenAIBest(idx)}
                      >
                        Use OpenAI Transcription as Best
                      </button>
                    )}
                  </div>
                )}
                {hiragana[idx] && hiraganaVisible[idx] && (
                  <div className="mt-2 text-pink-700 dark:text-pink-300 text-lg font-mono">{hiragana[idx]}</div>
                )}
                {/* Show breakdown if available and visible */}
                {breakdowns[idx] && breakdownVisible[idx] && (
                  <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm border border-cyan-300 dark:border-cyan-700">
                    {parseBreakdown(breakdowns[idx]!).map((item: BreakdownItem, i: number) => (
                      <div key={i} className="mb-4 p-2 bg-white dark:bg-gray-900 rounded shadow">
                        <div className="font-bold text-lg">{item.word} {item.reading && <span className="text-base text-gray-500">({item.reading})</span>}</div>
                        <div className="text-sm text-gray-700 dark:text-gray-200">Romaji: {item.romaji}</div>
                        <div className="text-sm text-gray-700 dark:text-gray-200">Meaning: {item.meaning}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{item.explanation}</div>
                        <div className="flex gap-2">
                          <button className="px-2 py-1 bg-blue-500 text-white rounded text-xs" disabled={saving} onClick={() => handleAdd('vocab', item)}>Add to Vocab</button>
                          <button className="px-2 py-1 bg-purple-600 text-white rounded text-xs" disabled={saving} onClick={() => handleAdd('grammar', item)}>Add to Grammar</button>
                        </div>
                      </div>
                    ))}
                    <InlineModal open={!!modal} onClose={() => setModal(null)}>
                      <div className="font-bold mb-2">This entry already exists:</div>
                      <pre className="bg-gray-100 dark:bg-gray-800 rounded p-2 text-xs overflow-x-auto mb-2">{JSON.stringify(modal?.existing, null, 2)}</pre>
                      <div className="mb-2">Do you want to add it anyway?</div>
                      <button className="px-4 py-2 bg-green-600 text-white rounded mr-2" disabled={saving} onClick={handleAddAnyway}>Add Anyway</button>
                    </InlineModal>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}