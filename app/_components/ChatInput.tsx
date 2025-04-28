'use client';

import { useState, useRef } from 'react';

interface ChatInputProps {
  onSubmit: (message: string) => void; // Expects only the message string
  isLoading: boolean;
  disabled?: boolean;
  // Removed onStreamedResponseChunk as ChatInput shouldn't handle streaming
}

export default function ChatInput({ onSubmit, isLoading, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim() || isLoading || disabled) return;
    onSubmit(message);
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'; // max 6 rows
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
    }
    // Otherwise, allow Shift+Enter for newline
  };

  return (
    <div className="w-full flex justify-center">
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
    </div>
  );
}