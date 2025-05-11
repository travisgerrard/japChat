import React from 'react';
import SentencePracticeItem from './SentencePracticeItem';
import type { BreakdownItem, ModalType } from '../../types/speak';

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

interface SentencePracticeListProps {
  sentences: string[];
  currentSentenceIdx: number | null;
  speechPractice: {
    recordingIdx: number | null;
    recognizing: boolean;
    recognizedSentences: string[];
    similarities: (number | null)[];
    audioUrls: (string | null)[];
    audioBlobs: (Blob | null)[];
    handleRecordSentence: (idx: number) => void;
  };
  wordScores: {
    existingScores: Record<number, number>;
    bestAttempts: Record<number, { transcript: string; similarity: number }>;
  };
  openAI: OpenAITranscriptionState;
  hiraganaState: HiraganaState;
  breakdowns: (string | null)[];
  breakdownVisible: boolean[];
  breakdownLoading: boolean[];
  saving: boolean;
  modal: ModalType | null;
  setModal: (modal: ModalType | null) => void;
  handlePlaySentence: (idx: number) => void;
  fetchBreakdown: (idx: number, sentence: string) => void;
  setBreakdownVisible: (fn: (prev: boolean[]) => boolean[]) => void;
  getSimilarityColor: (score: number | null | undefined, isDark: boolean) => string;
  handleAdd: (type: 'vocab' | 'grammar', item: BreakdownItem, sentenceIdx?: number) => void;
  handleAddAnyway: () => void;
  isDark: boolean;
}

const SentencePracticeList: React.FC<SentencePracticeListProps> = ({
  sentences,
  currentSentenceIdx,
  speechPractice,
  wordScores,
  openAI,
  hiraganaState,
  breakdowns,
  breakdownVisible,
  breakdownLoading,
  saving,
  modal,
  setModal,
  handlePlaySentence,
  fetchBreakdown,
  setBreakdownVisible,
  getSimilarityColor,
  handleAdd,
  handleAddAnyway,
  isDark,
}) => {
  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold mb-2">Practice Each Sentence</h2>
      <ol className="space-y-4">
        {sentences.map((sentence, idx) => (
          <SentencePracticeItem
            key={idx}
            sentence={sentence}
            idx={idx}
            currentSentenceIdx={currentSentenceIdx}
            recordingIdx={speechPractice.recordingIdx}
            recognizing={speechPractice.recognizing}
            isDark={isDark}
            existingScores={wordScores.existingScores}
            bestAttempts={wordScores.bestAttempts}
            recognizedSentences={speechPractice.recognizedSentences}
            similarities={speechPractice.similarities}
            audioUrls={speechPractice.audioUrls}
            audioBlobs={speechPractice.audioBlobs}
            openAI={openAI}
            hiraganaState={hiraganaState}
            breakdowns={breakdowns}
            breakdownVisible={breakdownVisible}
            breakdownLoading={breakdownLoading}
            saving={saving}
            modal={modal}
            setModal={setModal}
            handleRecordSentence={speechPractice.handleRecordSentence}
            handlePlaySentence={handlePlaySentence}
            fetchBreakdown={fetchBreakdown}
            setBreakdownVisible={setBreakdownVisible}
            getSimilarityColor={getSimilarityColor}
            handleAdd={handleAdd}
            handleAddAnyway={handleAddAnyway}
          />
        ))}
      </ol>
    </div>
  );
};

export default SentencePracticeList; 