import { useState, useRef } from 'react';

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export function useWhisperTranscriber() {
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  function transcribe() {
    setTranscript('');
    setLoading(true);
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTranscript('SpeechRecognition API not supported in this browser.');
      setLoading(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: unknown) => {
      // @ts-ignore
      const speechEvent = event as SpeechRecognitionEvent;
      setTranscript(speechEvent.results[0][0].transcript);
      setLoading(false);
    };
    recognition.onerror = (event: unknown) => {
      // @ts-ignore
      const errorEvent = event as SpeechRecognitionErrorEvent;
      setTranscript('Recognition error: ' + errorEvent.error);
      setLoading(false);
    };
    recognition.onend = () => {
      setLoading(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  return { transcript, loading, transcribe };
} 