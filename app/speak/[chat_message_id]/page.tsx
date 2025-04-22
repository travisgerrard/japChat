'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient } from '@/lib/supabase/client';

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

function computeSimilarity(a: string, b: string): number {
  // Normalize both strings
  const normA = normalizeForSimilarity(a);
  const normB = normalizeForSimilarity(b);
  if (!normA || !normB) return 0;
  const dist = levenshtein(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);
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

export default function SpeakPage() {
  const params = useParams();
  const chat_message_id = params.chat_message_id as string;
  const [message, setMessage] = useState<ChatMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const [showTranslation, setShowTranslation] = useState(false);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState<number | null>(null);
  const ttsUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const ttsActiveRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [jaVoice, setJaVoice] = useState<SpeechSynthesisVoice | null>(null);
  // Sentence-level recording state
  const [recordingIdx, setRecordingIdx] = useState<number | null>(null);
  const [recognizedSentences, setRecognizedSentences] = useState<string[]>([]);
  const [similarities, setSimilarities] = useState<(number | null)[]>([]);

  useEffect(() => {
    async function fetchMessage() {
      setLoading(true);
      setError(null);
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
      setVoices(allVoices);
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
    ttsUtterancesRef.current = sentences.map((sentence, idx) => {
      if (!sentence.trim()) return null;
      const utter = new window.SpeechSynthesisUtterance(sentence);
      utter.lang = 'ja-JP';
      if (jaVoice) utter.voice = jaVoice;
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

  function handleStop() {
    window.speechSynthesis.cancel();
    setCurrentSentenceIdx(null);
    ttsActiveRef.current = false;
    setIsSpeaking(false);
  }

  function getSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    return SpeechRecognition ? new SpeechRecognition() : null;
  }

  function handleRecordSentence(idx: number) {
    if (recognizing) {
      recognitionRef.current?.stop();
      setRecognizing(false);
      setRecordingIdx(null);
      return;
    }
    const recognition = getSpeechRecognition();
    if (!recognition) {
      alert('Speech Recognition is not supported in this browser.');
      return;
    }
    recognition.lang = 'ja-JP';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (
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
      // Only set similarity if this is a final result
      if (event.results[event.results.length - 1].isFinal) {
        setSimilarities(prev => {
          const arr = [...prev];
          arr[idx] = computeSimilarity(interimTranscript, sentences[idx]);
          return arr;
        });
        setRecognizing(false);
        setRecordingIdx(null);
      }
    };
    recognition.onerror = (
      // @ts-expect-error: SpeechRecognitionErrorEvent may not be defined in all browsers
      event
    ) => {
      setError('Speech recognition error: ' + event.error);
      setRecognizing(false);
      setRecordingIdx(null);
    };
    recognition.onend = () => {
      setRecognizing(false);
      setRecordingIdx(null);
    };
    recognitionRef.current = recognition;
    setRecognizing(true);
    setRecordingIdx(idx);
    recognition.start();
  }

  function handlePlaySentence(idx: number) {
    window.speechSynthesis.cancel();
    const sentence = sentences[idx];
    if (!sentence.trim()) return;
    const utter = new window.SpeechSynthesisUtterance(sentence);
    utter.lang = 'ja-JP';
    if (jaVoice) utter.voice = jaVoice;
    utter.onstart = () => setCurrentSentenceIdx(idx);
    utter.onend = () => setCurrentSentenceIdx(null);
    window.speechSynthesis.speak(utter);
  }

  const speechSupported = typeof window !== 'undefined' && ((window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Practice Speaking</h1>
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
        <div className="flex gap-4 mt-4">
          {!isSpeaking ? (
            <button className="px-4 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600" onClick={handlePlay}>Play</button>
          ) : (
            <button className="px-4 py-2 bg-red-500 text-white rounded shadow hover:bg-red-600" onClick={handleStop}>Stop</button>
          )}
          {english && (
            <button
              className="px-4 py-2 bg-gray-500 text-white rounded shadow hover:bg-gray-600"
              onClick={() => setShowTranslation((v) => !v)}
            >
              {showTranslation ? 'Hide Translation' : 'Show Translation'}
            </button>
          )}
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
        {/* Sentence-by-sentence recording */}
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-2">Practice Each Sentence</h2>
          <ol className="space-y-4">
            {sentences.map((sentence, idx) => (
              <li key={idx} className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                <div className="mb-2 font-mono text-lg">{sentence}</div>
                <button
                  className={`px-3 py-1 rounded shadow text-white mr-2 ${recordingIdx === idx && recognizing ? 'bg-yellow-600' : 'bg-yellow-500 hover:bg-yellow-600'}`}
                  onClick={() => handleRecordSentence(idx)}
                  disabled={!speechSupported || (recognizing && recordingIdx !== idx)}
                >
                  {recordingIdx === idx && recognizing ? 'Listening...' : 'Record'}
                </button>
                <button
                  className="px-3 py-1 rounded shadow text-white mr-2 bg-blue-500 hover:bg-blue-600"
                  onClick={() => handlePlaySentence(idx)}
                >
                  Play
                </button>
                {recognizedSentences[idx] && (
                  <div className="mt-2">
                    <div className="text-sm text-gray-700 dark:text-gray-200">Recognized: <span className="font-semibold">{recognizedSentences[idx]}</span></div>
                    {similarities[idx] !== null && (
                      <div className="text-xs text-gray-600">Similarity: {similarities[idx]}%</div>
                    )}
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