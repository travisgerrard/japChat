'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSubmit: (message: string) => void; // Expects only the message string
  isLoading: boolean;
  disabled?: boolean;
  suggestions?: string[];
  fetchSuggestions?: (context?: string) => Promise<void>;
  isAtBottom?: boolean;
  suggestLoading?: boolean;
  // Removed onStreamedResponseChunk as ChatInput shouldn't handle streaming
}

export default function ChatInput({ onSubmit, isLoading, disabled = false, suggestions = [], fetchSuggestions, isAtBottom = true, suggestLoading = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fetchedRef = useRef(false);
  const [showSuggestPrompt, setShowSuggestPrompt] = useState(true);

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
    fetchedRef.current = e.target.value.trim() !== '';
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
      {message.trim() === '' && !isLoading && !disabled && suggestions.length > 0 && isAtBottom && (
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
      {message.trim() === '' && !isLoading && !disabled && suggestions.length === 0 && isAtBottom && showSuggestPrompt && (
        <div className="flex flex-col items-center mb-2 w-full">
          <div className="relative inline-block">
            <button
              type="button"
              className="px-4 py-2 bg-blue-500 text-white rounded-full shadow hover:bg-blue-600 transition flex items-center justify-center min-w-[120px]"
              onClick={() => fetchSuggestions && fetchSuggestions()}
              disabled={suggestLoading}
            >
              {suggestLoading ? (
                <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
              ) : null}
              {suggestLoading ? 'Loading...' : 'Suggest Prompt'}
            </button>
            <span
              className="absolute top-0 right-0 -mt-2 -mr-2 bg-gray-300 text-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs cursor-pointer hover:bg-gray-400"
              onClick={e => { e.stopPropagation(); setShowSuggestPrompt(false); }}
              title="Dismiss"
              style={{ zIndex: 10 }}
            >
              ×
            </span>
          </div>
        </div>
      )}
    </div>
  );
}