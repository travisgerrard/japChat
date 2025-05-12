import ChatWindow, { type ChatMessage } from './ChatWindow';
import React from 'react';

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
  handleRetryLastResponse: (userPrompt?: string) => void;
  handleScrollBottomChange: (atBottom: boolean) => void;
  chatAreaHeight: string;
}

const ChatAreaComponent = ({ messages, isLoading, handleRetryLastResponse, handleScrollBottomChange, chatAreaHeight }: ChatAreaProps) => {
  return (
    <div className="flex-grow overflow-y-auto p-4 min-h-[300px] h-full pb-16" style={{ height: chatAreaHeight }}>
      <ChatWindow
        isLoading={isLoading}
        onRetryLastResponse={handleRetryLastResponse}
        onScrollBottomChange={handleScrollBottomChange}
        messages={messages}
      />
    </div>
  );
};

export const ChatArea = React.memo(ChatAreaComponent); 