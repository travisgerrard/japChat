'use client'; // <-- Make this a Client Component

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '../lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import ChatInput from './_components/ChatInput';
import ChatWindow, { type ChatMessage } from './_components/ChatWindow';
import Header from './_components/Header';
import Toast from './_components/Toast';
import { useChat } from './hooks/useChat';
import { useSRSImport } from './hooks/useSRSImport';
import { useInputBarHeight } from './hooks/useInputBarHeight';
import { useScrollLock } from './hooks/useScrollLock';
import { ChatLayout } from './_components/ChatLayout';
import { useToastContext } from './_components/ToastContext';
import { useUserContext } from './_components/UserContext';

export default function HomePage() {
  const supabase = createClient();
  const router = useRouter();
  const { user, isLoading, error } = useUserContext();
  const { inputBarHeight, inputBarRef } = useInputBarHeight();
  const { showToast, hideToast } = useToastContext();
  const [isAtBottom, setIsAtBottom] = useState(true);

  const setToastForHooks = useCallback((toast: { message: string, type: 'success' | 'error', retryFn?: (() => void) | null } | null) => {
    if (toast) showToast(toast);
    else hideToast();
  }, [showToast, hideToast]);

  // useChat hook for chat state/logic
  const {
    messages,
    setMessages,
    isWaitingForResponse,
    handleSendMessage,
    handleRetryLastResponse,
    handleManualRefresh,
    fetchSuggestions,
    suggestLoading,
  } = useChat({
    user,
    supabase,
    setToast: setToastForHooks,
    setImporting: () => {}, // No-op, handled by useSRSImport
    setShowImportingSnackbar: () => {}, // No-op, handled by useSRSImport
  });

  // useSRSImport hook for SRS import logic
  const {
    importing,
    lastParsedJSON,
    showImportingSnackbar,
    setShowImportingSnackbar,
    setLastParsedJSON,
    importSRS,
  } = useSRSImport({
    supabase,
    setToast: setToastForHooks,
    setMessages,
  });

  // Handler for scroll position change (must be top-level)
  const handleScrollBottomChange = useCallback((atBottom: boolean) => {
    setIsAtBottom(atBottom);
  }, []);

  useScrollLock();

  const memoizedHandleSendMessage = useCallback(handleSendMessage, [handleSendMessage]);
  const memoizedHandleRetryLastResponse = useCallback((userPrompt?: string) => {
    if (userPrompt) handleRetryLastResponse(userPrompt);
  }, [handleRetryLastResponse]);

  // Show loading indicator during initial auth check
  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  // Fixed header height (px)
  const HEADER_HEIGHT = 64;
  // Calculate chat area height
  const chatAreaHeight = `calc(100vh - ${HEADER_HEIGHT}px - ${inputBarHeight}px)`;

  // Helper: Store new SRS IDs in localStorage for SRSReview highlighting
  function storeNewSRSIds(vocabArr: Record<string, unknown>[], grammarArr: Record<string, unknown>[]) {
    const vocabIds = (vocabArr || []).map((v) => v.id).filter(Boolean);
    const grammarIds = (grammarArr || []).map((g) => g.id).filter(Boolean);
    const allIds = [...vocabIds, ...grammarIds];
    if (allIds.length > 0) {
      localStorage.setItem('newSRSIds', JSON.stringify(allIds));
    }
  }

  // Retry import function now uses hook state
  async function retryImport() {
    if (!lastParsedJSON) return;
    importSRS(lastParsedJSON);
  }

  // Render page content only if user is authenticated (checked in useEffect)
  return (
    user && (
      <ChatLayout
        email={user.email ?? null}
        chatAreaHeight={chatAreaHeight}
        messages={messages}
        isWaitingForResponse={isWaitingForResponse}
        handleRetryLastResponse={memoizedHandleRetryLastResponse}
        handleScrollBottomChange={handleScrollBottomChange}
        handleSendMessage={memoizedHandleSendMessage}
        isAtBottom={isAtBottom}
        inputBarRef={inputBarRef}
        importing={importing}
        showImportingSnackbar={showImportingSnackbar}
        setToast={setToastForHooks}
        fetchSuggestions={fetchSuggestions}
        suggestLoading={suggestLoading}
      />
    )
  );
}
