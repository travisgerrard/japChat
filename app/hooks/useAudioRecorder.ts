import { useRef, useState, useCallback } from 'react';
import Recorder from 'recorder-js';

// Minimal Recorder type for linting
type RecorderType = {
  start: () => void;
  stop: () => Promise<{ blob: Blob }>;
  init: (stream: MediaStream) => Promise<void>;
};

let sharedStream: MediaStream | null = null;
let sharedAudioContext: AudioContext | null = null;
let sharedRecorder: RecorderType | null = null;

export function useAudioRecorder(onBlob?: (blob: Blob, url: string) => void) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const stoppingRef = useRef(false);
  const recorderActiveRef = useRef(false);

  const start = useCallback(async () => {
    setAudioUrl(null);
    setAudioBlob(null);
    if (!sharedAudioContext) {
      sharedAudioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      console.log('[Daddy Long Legs] Created new shared AudioContext');
    }
    if (!sharedStream) {
      sharedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[Daddy Long Legs] Acquired new shared audio stream');
    }
    if (!sharedRecorder) {
      sharedRecorder = new Recorder(sharedAudioContext) as unknown as RecorderType;
      await sharedRecorder.init(sharedStream);
      console.log('[Daddy Long Legs] Initialized Recorder.js');
    }
    if (sharedRecorder) {
      sharedRecorder.start();
      recorderActiveRef.current = true;
      setRecording(true);
      stoppingRef.current = false;
      console.log('[Daddy Long Legs] Recorder.js started');
    }
  }, [onBlob]);

  const stop = useCallback(async () => {
    if (sharedRecorder && recorderActiveRef.current && !stoppingRef.current) {
      stoppingRef.current = true;
      console.log('[Daddy Long Legs] Recorder.js stopping...');
      const { blob } = await sharedRecorder.stop();
      recorderActiveRef.current = false;
      setAudioBlob(blob);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      console.log('[Daddy Long Legs] Recorder.js stopped, blob size:', blob.size, blob);
      if (onBlob) {
        console.log('[Daddy Long Legs] Calling onBlob callback with blob and url');
        onBlob(blob, url);
        console.log('[Daddy Long Legs] onBlob callback finished');
      }
      setRecording(false);
    } else {
      if (!sharedRecorder) console.warn('[Daddy Long Legs] Recorder.js stop called but no recorder');
      if (!recorderActiveRef.current) console.warn('[Daddy Long Legs] Recorder.js stop called but not actually recording');
      if (stoppingRef.current) console.warn('[Daddy Long Legs] Recorder.js stop already in progress');
    }
  }, [onBlob]);

  return { recording, audioUrl, audioBlob, start, stop };
} 