import { useState, useRef } from 'react';

export function useSpeechSynthesisControls(
  sentences: string[],
  jaVoice: SpeechSynthesisVoice | null,
  speechRate: number,
  setCurrentSentenceIdx: (idx: number | null) => void
) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const ttsUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const ttsActiveRef = useRef(false);

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
    const speakWithPause = async () => {
      for (let i = 0; i < ttsUtterancesRef.current.length; i++) {
        const utter = ttsUtterancesRef.current[i];
        window.speechSynthesis.speak(utter);
        await new Promise<void>(resolve => {
          utter.onend = () => {
            if (i === sentences.length - 1) setCurrentSentenceIdx(null);
            setTimeout(resolve, 400);
          };
        });
      }
    };
    speakWithPause();
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

  return {
    isSpeaking,
    isPaused,
    handlePlay,
    handlePause,
    handleResume,
    handleStop,
    setIsPaused,
  };
} 