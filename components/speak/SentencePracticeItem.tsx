import React from 'react';
import type { BreakdownItem, ModalType } from '../../types/speak';
import { BreakdownJSON, parseBreakdown } from '../../lib/japaneseUtils';

interface OpenAITranscriptionState {
  openaiTranscriptions: (string | null)[];
  openaiLoading: boolean[];
  openaiSimilarities: (number | null)[];
  analyzeWithOpenAI: (idx: number) => void;
  setOpenaiTranscriptions: (arr: (string | null)[]) => void;
  setOpenaiSimilarities: (arr: (number | null)[]) => void;
  setOpenaiLoading: (arr: boolean[]) => void;
}

interface HiraganaState {
  hiragana: (string | null)[];
  hiraganaLoading: boolean[];
  hiraganaVisible: boolean[];
  handleShowHiragana: (idx: number) => void;
  setHiragana: (arr: (string | null)[]) => void;
  setHiraganaLoading: (arr: boolean[]) => void;
  setHiraganaVisible: (arr: boolean[]) => void;
}

interface SentencePracticeItemProps {
  sentence: string;
  idx: number;
  currentSentenceIdx: number | null;
  recordingIdx: number | null;
  recognizing: boolean;
  isDark: boolean;
  existingScores: Record<number, number>;
  bestAttempts: Record<number, { transcript: string, similarity: number }>;
  recognizedSentences: string[];
  similarities: (number | null)[];
  audioUrls: (string | null)[];
  audioBlobs: (Blob | null)[];
  openAI: OpenAITranscriptionState;
  hiraganaState: HiraganaState;
  breakdowns: (string | null)[];
  breakdownVisible: boolean[];
  breakdownLoading: boolean[];
  saving: boolean;
  modal: ModalType | null;
  setModal: (modal: ModalType | null) => void;
  handleRecordSentence: (idx: number) => void;
  handlePlaySentence: (idx: number) => void;
  fetchBreakdown: (idx: number, sentence: string) => void;
  setBreakdownVisible: (fn: (prev: boolean[]) => boolean[]) => void;
  getSimilarityColor: (score: number | null, isDark: boolean) => string;
  handleAdd: (type: 'vocab' | 'grammar', item: BreakdownItem, idx: number) => void;
  handleAddAnyway: () => void;
}

const SentencePracticeItem: React.FC<SentencePracticeItemProps> = ({
  sentence,
  idx,
  currentSentenceIdx,
  recordingIdx,
  recognizing,
  isDark,
  existingScores,
  bestAttempts,
  recognizedSentences,
  similarities,
  audioUrls,
  audioBlobs,
  openAI,
  hiraganaState,
  breakdowns,
  breakdownVisible,
  breakdownLoading,
  saving,
  modal,
  setModal,
  handleRecordSentence,
  handlePlaySentence,
  fetchBreakdown,
  setBreakdownVisible,
  getSimilarityColor,
  handleAdd,
  handleAddAnyway,
}) => {
  return (
    <li className={`rounded p-3 transition-all duration-200 border ${
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
        <span className="text-xs text-gray-500">Sentence {idx + 1}</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        <button
          className={`px-3 py-1 rounded shadow text-white ${recordingIdx === idx && recognizing ? (isDark ? 'bg-yellow-400 text-gray-900' : 'bg-yellow-600') : (isDark ? 'bg-yellow-300 text-gray-900 hover:bg-yellow-400' : 'bg-yellow-500 hover:bg-yellow-600')}`}
          onClick={() => handleRecordSentence(idx)}
          disabled={recognizing && recordingIdx !== idx}
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
          onClick={() => hiraganaState.handleShowHiragana(idx)}
          disabled={hiraganaState.hiraganaLoading[idx]}
        >
          {hiraganaState.hiraganaLoading[idx]
            ? 'Loading Hiragana...'
            : hiraganaState.hiragana[idx] && hiraganaState.hiraganaVisible[idx]
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
          onClick={() => openAI.analyzeWithOpenAI(idx)}
          disabled={openAI.openaiLoading[idx]}
        >
          {openAI.openaiLoading[idx] ? 'Transcribing...' : 'Transcribe with OpenAI'}
        </button>
      )}
      {openAI.openaiTranscriptions[idx] && (
        <div className="mt-2 text-xs text-purple-700 dark:text-purple-300">
          OpenAI Transcription: {openAI.openaiTranscriptions[idx]}
          {openAI.openaiSimilarities[idx] != null && (
            <span className={`ml-2 ${getSimilarityColor(openAI.openaiSimilarities[idx], isDark)}`}>Similarity: {openAI.openaiSimilarities[idx]}%</span>
          )}
          {/* Show button if OpenAI similarity is better than best */}
          {openAI.openaiSimilarities[idx] != null && existingScores[idx] != null && openAI.openaiSimilarities[idx]! > existingScores[idx]! && (
            <button
              className="ml-2 px-2 py-1 bg-green-200 dark:bg-green-700 text-green-800 dark:text-green-200 rounded-full text-xs font-semibold hover:bg-green-300 dark:hover:bg-green-600"
              disabled
            >
              Use OpenAI Transcription as Best
            </button>
          )}
        </div>
      )}
      {hiraganaState.hiragana[idx] && hiraganaState.hiraganaVisible[idx] && (
        <div className="mt-2 text-pink-700 dark:text-pink-300 text-lg font-mono">{hiraganaState.hiragana[idx]}</div>
      )}
      {/* Show breakdown if available and visible */}
      {typeof breakdowns[idx] === 'object' && breakdowns[idx] !== null && breakdownVisible[idx] && (
        <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm border border-cyan-300 dark:border-cyan-700">
          {/* Show translation at the top if available */}
          {breakdowns[idx] && (breakdowns[idx] as BreakdownJSON).translation && (
            <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900 rounded text-base font-semibold text-blue-900 dark:text-blue-200">
              Translation: {(breakdowns[idx] as BreakdownJSON).translation}
            </div>
          )}
          {parseBreakdown(breakdowns[idx] as BreakdownJSON, idx).map((item: BreakdownItem, i: number) => {
            return (
              <div key={i} className="mb-4 p-2 bg-white dark:bg-gray-900 rounded shadow">
                <div className="font-bold text-lg">{item.word}</div>
                {item.reading && (
                  <div className="text-sm text-pink-700 dark:text-pink-300">Hiragana: {item.reading}</div>
                )}
                {item.kanji && (
                  <div className="text-sm text-blue-700 dark:text-blue-300">Kanji: {item.kanji}</div>
                )}
                <div className="text-sm text-gray-700 dark:text-gray-200">Romaji: {item.romaji}</div>
                <div className="text-sm text-gray-700 dark:text-gray-200">Meaning: {item.meaning}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{item.explanation}</div>
                <div className="flex gap-2">
                  <button className="px-2 py-1 bg-blue-500 text-white rounded text-xs" disabled={saving} onClick={() => handleAdd('vocab', item, idx)}>Add to Vocab</button>
                  <button className="px-2 py-1 bg-purple-600 text-white rounded text-xs" disabled={saving} onClick={() => handleAdd('grammar', item, idx)}>Add to Grammar</button>
                </div>
              </div>
            );
          })}
          {/* Modal logic should be handled at parent level */}
        </div>
      )}
    </li>
  );
};

export default SentencePracticeItem; 