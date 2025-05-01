'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSubmit: (message: string) => void; // Expects only the message string
  isLoading: boolean;
  disabled?: boolean;
  suggestions?: string[];
  fetchSuggestions?: (context?: string) => Promise<void>;
  // Removed onStreamedResponseChunk as ChatInput shouldn't handle streaming
}

export default function ChatInput({ onSubmit, isLoading, disabled = false, suggestions = [], fetchSuggestions }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fetchedRef = useRef(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim() || isLoading || disabled) return;
    onSubmit(message);
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    fetchedRef.current = false;
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'; // max 6 rows
    }
    if (e.target.value.trim() === '' && fetchSuggestions && !fetchedRef.current) {
      fetchSuggestions();
      fetchedRef.current = true;
    } else if (e.target.value.trim() !== '') {
      fetchedRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && !disabled && message.trim()) {
      e.preventDefault();
      onSubmit(message);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      fetchedRef.current = false;
    }
    // Otherwise, allow Shift+Enter for newline
  };

  useEffect(() => {
    if (message.trim() === '' && fetchSuggestions && !fetchedRef.current) {
      fetchSuggestions();
      fetchedRef.current = true;
    }
  }, [message, fetchSuggestions]);

  return (
    <div className="w-full flex flex-col items-center">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-2xl items-center bg-white/80 dark:bg-gray-900/80 rounded-xl shadow-lg px-4 py-2 mb-4 border border-gray-200 dark:border-gray-700 backdrop-blur"
        style={{ boxSizing: 'border-box', position: 'relative' }}
      >
        <textarea
          id="chat-input"
          ref={textareaRef}
          className="flex-grow bg-transparent border-none focus:ring-0 px-2 py-1 text-base outline-none dark:text-gray-100 rounded-xl resize-none min-h-[2.5rem] max-h-40"
          value={message}
          onChange={handleInput}
          placeholder="Message Jap-Chat…"
          required
          disabled={isLoading || disabled}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          rows={1}
          style={{ overflow: 'hidden' }}
        />
      </form>
      {message.trim() === '' && !isLoading && !disabled && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 w-full justify-center items-center sm:justify-center">
          {suggestions.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-800 transition mx-auto"
              onClick={() => setMessage(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}