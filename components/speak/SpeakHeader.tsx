import StoryDisplay from './StoryDisplay';
import React from 'react';

interface SpeakHeaderProps {
  sentences: string[];
  wordScores: { existingScores: Record<number, number> };
  japanese: string;
  english: string;
  showTranslation: boolean;
  setShowTranslation: (show: boolean) => void;
  isSpeaking: boolean;
  isPaused: boolean;
  handlePlay: () => void;
  handlePause: () => void;
  handleResume: () => void;
  handleStop: () => void;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  currentSentenceIdx: number | null;
  splitSentences: (text: string) => string[];
  stripFurigana: (text: string) => string;
  isDark: boolean;
  englishAvailable: boolean;
}

const SpeakHeader: React.FC<SpeakHeaderProps> = ({
  sentences,
  wordScores,
  japanese,
  english,
  showTranslation,
  setShowTranslation,
  isSpeaking,
  isPaused,
  handlePlay,
  handlePause,
  handleResume,
  handleStop,
  speechRate,
  setSpeechRate,
  currentSentenceIdx,
  splitSentences,
  stripFurigana,
  isDark,
  englishAvailable,
}) => {
  return (
    <>
      <h1 className="text-2xl font-bold mb-6">
        Practice Speaking
        {sentences && sentences.length > 0 && (
          <span className="ml-4 text-lg font-normal text-gray-600 dark:text-gray-300 align-middle">
            ({Object.values(wordScores.existingScores).filter(score => score >= 80).length} / {sentences.length} phrases completed ≥80%)
          </span>
        )}
      </h1>
      <StoryDisplay
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
        englishAvailable={englishAvailable}
      />
    </>
  );
};

export default SpeakHeader; 