'use client';

import { useState } from 'react';

interface ChatInputProps {
  onSubmit: (message: string) => void; // Expects only the message string
  isLoading: boolean;
  // Removed onStreamedResponseChunk as ChatInput shouldn't handle streaming
}

export default function ChatInput({ onSubmit, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim() || isLoading) return;
    onSubmit(message);
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && message.trim()) {
      e.preventDefault();
      onSubmit(message);
      setMessage('');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed bottom-0 left-0 w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center px-2 py-1 z-50"
      style={{ boxSizing: 'border-box' }}
    >
      <input
        id="chat-input"
        type="text"
        className="flex-grow bg-transparent border-none focus:ring-0 px-2 py-3 text-base outline-none dark:text-gray-100"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message Jap-Chat…"
        required
        disabled={isLoading}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      <button
        type="submit"
        disabled={isLoading || !message.trim()}
        className="ml-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        style={{ height: 'auto' }}
      >
        {isLoading ? 'Generating...' : 'Send'}
      </button>
    </form>
  );
}