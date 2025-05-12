import { ChatHeader } from './ChatHeader';
import { ChatArea } from './ChatArea';
import { ChatInputBar } from './ChatInputBar';
import { ImportSnackbar } from './ImportSnackbar';
import { ImportingIndicator } from './ImportingIndicator';
import React from 'react';
import type { ChatMessage } from './ChatWindow';

interface ChatLayoutProps {
  email: string | null;
  chatAreaHeight: string;
  messages: ChatMessage[];
  isWaitingForResponse: boolean;
  handleRetryLastResponse: (userPrompt?: string) => void;
  handleScrollBottomChange: (atBottom: boolean) => void;
  handleSendMessage: (msg: string) => void;
  isAtBottom: boolean;
  inputBarRef: React.RefObject<HTMLDivElement>;
  importing: boolean;
  showImportingSnackbar: boolean;
  setToast: (toast: { message: string; type: 'success' | 'error'; retryFn?: (() => void) | null } | null) => void;
}

export function ChatLayout({
  email,
  chatAreaHeight,
  messages,
  isWaitingForResponse,
  handleRetryLastResponse,
  handleScrollBottomChange,
  handleSendMessage,
  isAtBottom,
  inputBarRef,
  importing,
  showImportingSnackbar,
  setToast,
}: ChatLayoutProps) {
  return (
    <>
      <ChatHeader email={email} />
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-900">
        <div className="w-full max-w-5xl flex flex-col overflow-hidden h-full pt-16">
          <ChatArea
            messages={messages}
            isLoading={isWaitingForResponse}
            handleRetryLastResponse={handleRetryLastResponse}
            handleScrollBottomChange={handleScrollBottomChange}
            chatAreaHeight={chatAreaHeight}
          />
          <ChatInputBar
            onSubmit={handleSendMessage}
            isLoading={isWaitingForResponse || importing}
            disabled={importing}
            isAtBottom={isAtBottom}
            inputBarRef={inputBarRef}
          />
        </div>
        <ImportSnackbar show={showImportingSnackbar} />
        <ImportingIndicator show={importing} />
      </div>
    </>
  );
} 