'use client';

import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

// Define the structure of a message object (can be shared or defined here)
export interface ChatMessage {
  id: string; // Use string for UUIDs or DB IDs
  type: 'user_prompt' | 'app_response';
  content: string;
  // Add other fields like created_at if needed from DB
}

interface ChatWindowProps {
  messages: ChatMessage[]; // Receive messages directly from parent
  isLoading?: boolean;     // Receive loading state from parent
  bottomPadding?: number;  // Dynamic bottom padding for fixed input bar
}

export default function ChatWindow({ messages, isLoading = false, bottomPadding = 0 }: ChatWindowProps) {
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Helper: Is user at (or near) the bottom?
  const isAtBottom = () => {
    const container = containerRef.current;
    if (!container) return true;
    // Allow a small threshold for 'near' bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < 40;
  };

  // Effect: Only auto-scroll if user is at (or near) bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (isAtBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    // Otherwise, do nothing (preserve scroll position)
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="flex-grow overflow-y-auto p-6 flex flex-col space-y-10 min-h-0"
      style={{ paddingBottom: bottomPadding }}
    >
      {messages.map((msg, idx) => {
        const isLastAppResponse =
          msg.type === 'app_response' &&
          messages.filter(m => m.type === 'app_response').slice(-1)[0]?.id === msg.id;
        const isIncomplete =
          isLastAppResponse &&
          msg.content &&
          !msg.content.trim().match(/(\n\n|---|\*\*\w|$)/);
        return (
          <div
            key={msg.id}
            className={`flex ${
              msg.type === 'user_prompt' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.type === 'user_prompt' ? (
              <div className="max-w-lg bg-blue-500 text-white px-5 py-2 rounded-2xl shadow font-medium">
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            ) : (
              <div className="prose prose-2xl dark:prose-invert w-full font-sans [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold dark:[&_h1]:text-white dark:[&_h2]:text-white dark:[&_h3]:text-white">
                <div className="w-full relative">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    rehypePlugins={[rehypeRaw as any]}
                  >
                    {msg.content || (isLoading ? '...' : '')}
                  </ReactMarkdown>
                  {isIncomplete && (
                    <div className="mt-2 text-yellow-400 font-semibold text-sm">
                      Warning: Story may have been cut off. Please try again.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Show the loading indicator specifically for the AI response placeholder if needed */}
      {/* The logic above now handles showing '...' if content is empty and isLoading is true */}

      {/* Element to scroll to */}
      <div ref={messagesEndRef} />
    </div>
  );
}