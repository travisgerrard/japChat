import React from 'react';

interface StoryDisplayProps {
  japanese: string;
  english: string;
  showTranslation: boolean;
  setShowTranslation: (v: boolean) => void;
  isSpeaking: boolean;
  isPaused: boolean;
  handlePlay: () => void;
  handlePause: () => void;
  handleResume: () => void;
  handleStop: () => void;
  speechRate: number;
  setSpeechRate: (v: number) => void;
  currentSentenceIdx: number | null;
  splitSentences: (text: string) => string[];
  stripFurigana: (text: string) => string;
  isDark: boolean;
  englishAvailable: boolean;
}

const StoryDisplay: React.FC<StoryDisplayProps> = ({
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
        {englishAvailable && (
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded shadow hover:bg-gray-600"
            onClick={() => setShowTranslation(!showTranslation)}
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
            min={0.25}
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
    </div>
  );
};

export default StoryDisplay; 