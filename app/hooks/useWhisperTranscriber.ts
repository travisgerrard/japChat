import { useState, useRef } from 'react';

// Robust type guards for SpeechRecognition API for cross-browser and SSR compatibility
// Use a generic constructor type to avoid explicit 'any' and satisfy linter

type SpeechRecognitionCtorType = new (...args: unknown[]) => { [key: string]: unknown };

type MaybeSpeechRecognition = InstanceType<SpeechRecognitionCtorType> | null;

export function useWhisperTranscriber() {
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef<MaybeSpeechRecognition>(null);

  function transcribe() {
    setTranscript('');
    setLoading(true);
    // SpeechRecognition may not exist on window in all browsers
    const SpeechRecognitionCtor =
      typeof window !== 'undefined'
        ? (window.SpeechRecognition || (window as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition)
        : undefined;
    if (!SpeechRecognitionCtor) {
      setTranscript('SpeechRecognition API not supported in this browser.');
      setLoading(false);
      return;
    }
    const recognition = new (SpeechRecognitionCtor as unknown as SpeechRecognitionCtorType)();
    recognition.lang = 'ja-JP';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: unknown) => {
      // event.results is expected to be SpeechRecognitionResultList, but fallback to unknown for cross-browser safety
      const results = (event as { results: { [key: number]: { transcript: string }[] } }).results;
      setTranscript(results[0][0].transcript);
      setLoading(false);
    };
    recognition.onerror = (event: { error: string }) => {
      setTranscript('Recognition error: ' + event.error);
      setLoading(false);
    };
    recognition.onend = () => {
      setLoading(false);
    };
    recognitionRef.current = recognition;
    (recognition.start as unknown as () => void)();
  }

  return { transcript, loading, transcribe };
} 