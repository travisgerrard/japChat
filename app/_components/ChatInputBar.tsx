import ChatInput from './ChatInput';
import React from 'react';

interface ChatInputBarProps {
  onSubmit: (msg: string) => void;
  isLoading: boolean;
  disabled: boolean;
  isAtBottom: boolean;
  inputBarRef: React.RefObject<HTMLDivElement>;
}

const ChatInputBarComponent = ({ onSubmit, isLoading, disabled, isAtBottom, inputBarRef }: ChatInputBarProps) => {
  return (
    <div ref={inputBarRef}>
      <ChatInput
        onSubmit={onSubmit}
        isLoading={isLoading}
        disabled={disabled}
        isAtBottom={isAtBottom}
      />
    </div>
  );
};

export const ChatInputBar = React.memo(ChatInputBarComponent); 