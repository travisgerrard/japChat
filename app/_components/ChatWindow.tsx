'use client';

import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { Pluggable } from 'unified';

// Define the structure of a message object (can be shared or defined here)
export interface ChatMessage {
  id: string; // Use string for UUIDs or DB IDs
  type: 'user_prompt' | 'app_response';
  content: string;
  created_at: string;
  // Add other fields like created_at if needed from DB
}

interface PageData {
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface ChatWindowProps {
  isLoading?: boolean;
  bottomPadding?: number;
  onRetryLastResponse?: (userPrompt: string) => void;
  onScrollBottomChange?: (atBottom: boolean) => void;
  messages?: ChatMessage[];
  setSize?: (size: number | ((size: number) => number)) => Promise<unknown>;
  hasMore?: boolean;
}

export default function ChatWindow({ isLoading = false, bottomPadding = 0, onRetryLastResponse, onScrollBottomChange, messages = [], setSize, hasMore }: ChatWindowProps) {
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastIsAtBottom = useRef(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Helper: Is user at (or near) the bottom?
  const isAtBottom = () => {
    const container = containerRef.current;
    if (!container) return true;
    return container.scrollHeight - container.scrollTop - container.clientHeight < 40;
  };

  // Effect: Only auto-scroll if user is at (or near) bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (isAtBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Effect: Listen for scroll and notify parent if at bottom changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onScrollBottomChange) return;

    const handleScroll = () => {
      const atBottom = isAtBottom();
      if (lastIsAtBottom.current !== atBottom) {
        lastIsAtBottom.current = atBottom;
        onScrollBottomChange(atBottom);
      }
      // Load more messages when scrolling near the top
      if (container.scrollTop < 100 && hasMore && setSize && !isLoadingMore) {
        setIsLoadingMore(true);
        setSize((prev: number) => prev + 1).finally(() => setIsLoadingMore(false));
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [onScrollBottomChange, hasMore, setSize, isLoadingMore]);

  // Show loading indicator at the top when loading more messages
  const LoadingIndicator = () => (
    <div className="flex justify-center py-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="flex-grow overflow-y-auto p-6 flex flex-col space-y-10 min-h-0"
      style={{ paddingBottom: bottomPadding }}
    >
      {isLoadingMore && <LoadingIndicator />}
      {messages.map((msg, idx) => {
        const isLastAppResponse =
          msg.type === 'app_response' &&
          messages.filter(m => m.type === 'app_response').slice(-1)[0]?.id === msg.id;
        const isIncomplete =
          isLastAppResponse &&
          msg.content &&
          !msg.content.trim().match(/(\n\n|---|\*\*\w|$)/);
        let lastUserPrompt = '';
        if (isIncomplete) {
          for (let i = idx - 1; i >= 0; i--) {
            if (messages[i].type === 'user_prompt') {
              lastUserPrompt = messages[i].content;
              break;
            }
          }
        }
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
                    rehypePlugins={[rehypeRaw as Pluggable]}
                  >
                    {msg.content || (isLoading ? '...' : '')}
                  </ReactMarkdown>
                  {isIncomplete && (
                    <div className="mt-2 text-yellow-400 font-semibold text-sm flex items-center gap-2">
                      <span>Warning: Story may have been cut off. Please try again.</span>
                      {typeof onRetryLastResponse === 'function' && lastUserPrompt && (
                        <button
                          className="ml-2 px-3 py-1 rounded bg-yellow-500 text-white font-bold text-xs hover:bg-yellow-600 transition-colors"
                          onClick={() => onRetryLastResponse(lastUserPrompt)}
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}