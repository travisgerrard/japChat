export {};

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }

  let SpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  };

  interface SpeechRecognition extends EventTarget {
    start(): void;
    stop(): void;
    abort(): void;
    onaudioend?: (this: SpeechRecognition, ev: Event) => unknown;
    onaudiostart?: (this: SpeechRecognition, ev: Event) => unknown;
    onend?: (this: SpeechRecognition, ev: Event) => unknown;
    onerror?: (this: SpeechRecognition, ev: Event) => unknown;
    onnomatch?: (this: SpeechRecognition, ev: Event) => unknown;
    onresult?: (this: SpeechRecognition, ev: Event) => unknown;
    onsoundend?: (this: SpeechRecognition, ev: Event) => unknown;
    onsoundstart?: (this: SpeechRecognition, ev: Event) => unknown;
    onspeechend?: (this: SpeechRecognition, ev: Event) => unknown;
    onspeechstart?: (this: SpeechRecognition, ev: Event) => unknown;
    onstart?: (this: SpeechRecognition, ev: Event) => unknown;
    // ...add more methods/properties as needed
  }
} 