'use client';
import { useRef, useState } from 'react';
import { useWhisperTranscriber } from './useWhisperTranscriber';

export default function SpeakTestPage() {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { transcript, loading, transcribe } = useWhisperTranscriber();

  const startRecording = async () => {
    setAudioBlob(null);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    } catch (e) {
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      } catch (e2) {
        mediaRecorder = new MediaRecorder(stream);
      }
    }
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setAudioBlob(blob);
      if (blob.size === 0) {
        alert('No audio was recorded. Please try again.');
        return;
      }
      transcribe();
    };
    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <main className="p-6 space-y-4">
      <button
        onClick={recording ? stopRecording : startRecording}
        className={`px-4 py-2 rounded text-white ${recording ? 'bg-red-600' : 'bg-indigo-600'}`}
      >
        {recording ? 'Stop Recording' : 'Start Recording'}
      </button>
      {audioBlob && (
        <audio controls src={URL.createObjectURL(audioBlob)} className="w-full mt-2" />
      )}
      <div className="mt-4">
        <strong>Transcript:</strong>
        <div className="bg-gray-100 p-4 rounded min-h-[4rem] whitespace-pre-wrap">
          <span className={loading ? 'text-gray-700 font-semibold' : ''}>
            {loading ? 'Transcribing…' : transcript}
          </span>
        </div>
      </div>
    </main>
  );
} 