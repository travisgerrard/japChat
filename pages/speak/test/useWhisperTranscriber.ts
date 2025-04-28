import { useState, useRef } from 'react';

// Remove custom type definitions and rely on built-in DOM types

export function useWhisperTranscriber() {
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef<null | SpeechRecognition>(null);

  function transcribe() {
    setTranscript('');
    setLoading(true);
    // SpeechRecognition may not exist on window in all browsers
    const SpeechRecognitionCtor = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setTranscript('SpeechRecognition API not supported in this browser.');
      setLoading(false);
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'ja-JP';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      setTranscript(event.results[0][0].transcript);
      setLoading(false);
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setTranscript('Recognition error: ' + event.error);
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