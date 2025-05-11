'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '../../lib/supabase/client';
import { tokenizeWords } from '../../lib/tokenizeWords';
import { fetchJishoReading, normalizeToHiragana } from '../../app/util/jisho';
// @ts-expect-error: Missing type declarations for useAudioRecorder custom hook
import { useAudioRecorder } from '../../app/hooks/useAudioRecorder';
import { v4 as uuidv4 } from 'uuid';
import {
  extractSections,
  stripFurigana,
  splitSentences,
  extractJSONSection,
} from '../../lib/japaneseUtils';
import type { ChatMessage, VocabNote, BreakdownItem, BreakdownJSON } from '../../types/speak';
import SentencePracticeItem from './SentencePracticeItem';
import VocabGrammarModal from './VocabGrammarModal';
import StoryDisplay from './StoryDisplay';
// @ts-expect-error: Missing type declarations for useSentenceBreakdown custom hook
import { useSentenceBreakdown } from '../../app/hooks/useSentenceBreakdown';
// @ts-expect-error: Missing type declarations for useSpeechPractice custom hook
import { useSpeechPractice } from '../../app/hooks/useSpeechPractice';
// @ts-expect-error: Missing type declarations for useOpenAITranscription custom hook
import { useOpenAITranscription } from '../../app/hooks/useOpenAITranscription';
// @ts-expect-error: Missing type declarations for useHiragana custom hook
import { useHiragana } from '../../app/hooks/useHiragana';
// @ts-expect-error: Missing type declarations for useWordScores custom hook
import { useWordScores } from '../../app/hooks/useWordScores';
import { useParams } from 'next/navigation';
import SpeakHeader from './SpeakHeader';
import SentencePracticeList from './SentencePracticeList';
import { useSpeechSynthesisControls } from '../../hooks/useSpeechSynthesisControls';

export default function SpeakPageContainer() {
  const params = useParams() ?? {};
  const chat_message_id = (params as { chat_message_id?: string }).chat_message_id as string;
  const [message, setMessage] = useState<ChatMessage | null>(null);
  const { japanese, english } = extractSections(message?.content ?? "");
  const japaneseNoFurigana = stripFurigana(japanese);
  const sentences = splitSentences(japaneseNoFurigana);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState<number | null>(null);
  const [jaVoice, setJaVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [modal, setModal] = useState<{ type: 'vocab' | 'grammar', item: BreakdownItem, existing: Record<string, unknown> | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const hiraganaState = useHiragana(message ? sentences : []);
  const speechPractice = useSpeechPractice(message ? sentences : [], message ?? { id: '', user_id: '', content: '', role: '', created_at: '' }, supabase);
  const openAI = useOpenAITranscription(
    message ? sentences : [],
    speechPractice.audioBlobs,
    message ?? { id: '', user_id: '', content: '', role: '', created_at: '' },
    supabase,
    () => wordScores.refetchScores()
  );
  const wordScores = useWordScores(message, supabase);
  const {
    breakdowns,
    breakdownLoading,
    breakdownVisible,
    setBreakdownVisible,
    fetchBreakdown,
  } = useSentenceBreakdown(chat_message_id, sentences);
  const {
    isSpeaking,
    isPaused,
    handlePlay,
    handlePause,
    handleResume,
    handleStop,
    setIsPaused,
  } = useSpeechSynthesisControls(
    sentences,
    jaVoice,
    speechRate,
    setCurrentSentenceIdx
  );

  useEffect(() => {
    function updateVoices() {
      const allVoices = window.speechSynthesis.getVoices();
      const kyokoEnhanced = allVoices.find(v => v.name?.toLowerCase().includes('kyokoenhanced'));
      const kyoko = allVoices.find(v => v.name?.toLowerCase() === 'kyoko');
      const ja = allVoices.find(v => v.lang?.toLowerCase().startsWith('ja')) || null;
      setJaVoice(kyokoEnhanced || kyoko || ja || null);
    }
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, []);

  useEffect(() => {
    async function fetchMessage() {
      setLoading(true);
      setError(null);
      if (chat_message_id === 'test') {
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

  if (loading) return <div className="max-w-xl mx-auto p-8">Loading...</div>;
  if (error) return <div className="max-w-xl mx-auto p-8 text-red-500">{error}</div>;

  const vocabNotes = message && message.content ? extractJSONSection(message.content, 'vocab_notes') as unknown[] : [];
  const grammarNotes = message?.content ? extractJSONSection(message.content, 'grammar_notes') : [];

  const isDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

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

  function getSimilarityColor(score: number | null | undefined, isDark: boolean) {
    if (typeof score !== 'number' || score === null) return '';
    if (score >= 85) return isDark ? 'text-lime-300 font-bold' : 'text-green-600 font-bold';
    if (score >= 60) return isDark ? 'text-yellow-300 font-semibold' : 'text-yellow-600 font-semibold';
    return isDark ? 'text-rose-400 font-semibold' : 'text-red-600 font-semibold';
  }

  async function handleAdd(type: 'vocab' | 'grammar', item: BreakdownItem, sentenceIdx?: number) {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      alert('Not logged in');
      setSaving(false);
      return;
    }
    const now = new Date();
    const nextReview = now.toISOString();
    const contextSentence = typeof sentenceIdx === 'number' ? sentences[sentenceIdx] : '';
    if (type === 'vocab') {
      const { data: existing } = await supabase
        .from('vocabulary')
        .select('id')
        .eq('user_id', userId)
        .eq('word', item.word)
        .maybeSingle();
      if (existing) {
        setModal({ type, item, existing });
        setSaving(false);
        return;
      }
      const { error } = await supabase.from('vocabulary').insert({
        id: uuidv4(),
        user_id: userId,
        word: item.word,
        kanji: item.kanji,
        reading: item.reading,
        meaning: item.meaning,
        context_sentence: contextSentence,
        chat_message_id: chat_message_id || null,
        srs_level: 0,
        next_review: nextReview,
      });
      if (!error && contextSentence) {
        await supabase.from('vocab_story_links').insert({
          id: uuidv4(),
          user_id: userId,
          vocab_word: item.word,
          example_sentence: contextSentence,
          chat_message_id: chat_message_id || null,
          created_at: now,
        });
      }
      setSaving(false);
      if (error) {
        alert('Error: ' + error.message);
      } else {
        alert('Added!');
      }
    } else {
      const { data: existing } = await supabase
        .from('grammar')
        .select('id, explanation')
        .eq('user_id', userId)
        .eq('grammar_point', item.word)
        .maybeSingle();
      if (existing) {
        setModal({ type, item, existing });
        setSaving(false);
        return;
      }
      const { error } = await supabase.from('grammar').insert({
        id: uuidv4(),
        user_id: userId,
        grammar_point: item.word,
        label: '',
        explanation: item.explanation,
        story_usage: '',
        narrative_connection: '',
        example_sentence: contextSentence,
        chat_message_id: chat_message_id || null,
        srs_level: 0,
        next_review: nextReview,
      });
      if (!error && contextSentence) {
        await supabase.from('grammar_story_links').insert({
          id: uuidv4(),
          user_id: userId,
          grammar_point: item.word,
          example_sentence: contextSentence,
          chat_message_id: chat_message_id || null,
          created_at: now,
        });
      }
      setSaving(false);
      if (error) {
        alert('Error: ' + error.message);
      } else {
        alert('Added!');
      }
    }
  }

  async function handleAddAnyway() {
    if (!modal) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      alert('Not logged in');
      setSaving(false);
      return;
    }
    const now = new Date();
    const nextReview = now.toISOString();
    const contextSentence = typeof modal.item.sentenceIdx === 'number' ? sentences[modal.item.sentenceIdx] : '';
    if (modal.type === 'vocab') {
      const { error } = await supabase.from('vocabulary').insert({
        id: uuidv4(),
        user_id: userId,
        word: modal.item.word,
        kanji: modal.item.kanji,
        reading: modal.item.reading,
        meaning: modal.item.meaning,
        context_sentence: contextSentence,
        chat_message_id: chat_message_id || null,
        srs_level: 0,
        next_review: nextReview,
      });
      setSaving(false);
      setModal(null);
      if (error) {
        alert('Error: ' + error.message);
      } else {
        alert('Added!');
      }
    } else {
      const { error } = await supabase.from('grammar').insert({
        id: uuidv4(),
        user_id: userId,
        grammar_point: modal.item.word,
        label: '',
        explanation: modal.item.explanation,
        story_usage: '',
        narrative_connection: '',
        example_sentence: '',
        chat_message_id: chat_message_id || null,
        srs_level: 0,
        next_review: nextReview,
      });
      setSaving(false);
      setModal(null);
      if (error) {
        alert('Error: ' + error.message);
      } else {
        alert('Added!');
      }
    }
  }

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh' }} className="pt-16">
      <div className="max-w-xl mx-auto p-8">
        <SpeakHeader
          sentences={sentences}
          wordScores={wordScores}
          japanese={japanese}
          english={english}
          showTranslation={showTranslation}
          setShowTranslation={setShowTranslation}
          isSpeaking={isSpeaking}
          isPaused={isPaused}
          handlePlay={handlePlay}
          handlePause={handlePause}
          handleResume={handleResume}
          handleStop={handleStop}
          speechRate={speechRate}
          setSpeechRate={setSpeechRate}
          currentSentenceIdx={currentSentenceIdx}
          splitSentences={splitSentences}
          stripFurigana={stripFurigana}
          isDark={isDark}
          englishAvailable={!!english}
        />
        {!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && (
          <div className="mt-4 text-red-500">Speech Recognition is not supported in this browser.</div>
        )}
        <SentencePracticeList
          sentences={sentences}
          currentSentenceIdx={currentSentenceIdx}
          speechPractice={speechPractice}
          wordScores={wordScores}
          openAI={openAI}
          hiraganaState={hiraganaState}
          breakdowns={breakdowns}
          breakdownVisible={breakdownVisible}
          breakdownLoading={breakdownLoading}
          saving={saving}
          modal={modal}
          setModal={setModal}
          handlePlaySentence={handlePlaySentence}
          fetchBreakdown={fetchBreakdown}
          setBreakdownVisible={setBreakdownVisible}
          getSimilarityColor={getSimilarityColor}
          handleAdd={handleAdd}
          handleAddAnyway={handleAddAnyway}
          isDark={isDark}
        />
      </div>
      <VocabGrammarModal
        open={!!modal}
        onClose={() => setModal(null)}
        existing={modal?.existing ?? null}
        saving={saving}
        onAddAnyway={handleAddAnyway}
      />
    </div>
  );
} 