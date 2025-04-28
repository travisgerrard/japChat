import { useState, useRef } from 'react';

export function useWhisperTranscriber() {
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  function transcribe() {
    setTranscript('');
    setLoading(true);
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTranscript('SpeechRecognition API not supported in this browser.');
      setLoading(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      setTranscript(event.results[0][0].transcript);
      setLoading(false);
    };
    recognition.onerror = (event: any) => {
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