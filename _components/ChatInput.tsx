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

    onSubmit(message); // Call onSubmit with only the message string
    setMessage(''); // Clear input immediately
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && message.trim()) {
      e.preventDefault(); // Prevent default Enter behavior (new line)
      onSubmit(message);  // Call onSubmit with only the message string
      setMessage('');     // Clear the input
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <label htmlFor="chat-input" className="sr-only">
        Enter your story request
      </label>
      <div className="flex items-center">
        <textarea
          id="chat-input"
          rows={2}
          className="flex-grow w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 disabled:opacity-50 resize-none"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g., Create a Level 1 story with Genki Chapter 5 grammar about a picnic..."
          required
          disabled={isLoading}
          onKeyDown={handleKeyDown} // Use the separate handler
        />
        <button
          type="submit"
          disabled={isLoading || !message.trim()}
          className="ml-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 h-full" // Adjusted margin and height
        >
          {isLoading ? 'Generating...' : 'Send'}
        </button>
      </div>
    </form>
  );
}