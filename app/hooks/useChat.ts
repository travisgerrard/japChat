import { useState, useEffect, useCallback } from 'react';
import type { User, SupabaseClient } from '@supabase/supabase-js';
import type { ChatMessage } from '../_components/ChatWindow';

interface UseChatArgs {
  user: User | null;
  supabase: SupabaseClient;
  setToast: (toast: { message: string, type: 'success' | 'error', retryFn?: (() => void) | null } | null) => void;
  setImporting: (val: boolean) => void;
  setShowImportingSnackbar: (val: boolean) => void;
}

export function useChat({ user, supabase, setToast, setImporting, setShowImportingSnackbar }: UseChatArgs) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // Fetch suggestions from backend when input is blank and at bottom
  const fetchSuggestions = useCallback(async () => {
    let context = '';
    try {
      const userPrompts = messages
        .filter((msg) => msg.type === 'user_prompt')
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const lastN = userPrompts.slice(-5).map((msg) => msg.content);
      context = lastN.join('\n');
    } catch (e: unknown) {
      context = '';
    }
    setSuggestLoading(true);
    try {
      const res = await fetch('/api/suggest-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });
      if (!res.ok) throw new Error('Failed to fetch suggestions');
      const data = await res.json();
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestLoading(false);
    }
  }, [messages]);

  // Fetch all chat messages on mount and after sending a message
  useEffect(() => {
    const fetchMessages = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const response = await fetch('/api/chat/history?limit=100', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Accept': 'application/json',
        },
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data && Array.isArray(data.messages)) {
        setMessages(data.messages.reverse());
      }
    };
    if (user) fetchMessages();
  }, [user, supabase]);

  const handleSendMessage = async (messageContent: string) => {
    if (!user) return;
    setIsWaitingForResponse(true);
    setImporting(false);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user_prompt',
      content: messageContent,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session || !session.access_token) {
        setToast({ message: 'Authentication error: Could not get session token.', type: 'error' });
        throw new Error('Authentication error: Could not get session token.');
      }
      const requestBody = JSON.stringify({ message: messageContent });
      const apiHeaders = new Headers();
      apiHeaders.append('Content-Type', 'application/json');
      apiHeaders.append('Authorization', `Bearer ${session.access_token}`);
      apiHeaders.append('Accept', 'application/json');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: apiHeaders,
        body: requestBody,
      });
      if (!response.ok) {
        const errorBody = await response.text();
        setToast({ message: `API request failed: ${errorBody}`, type: 'error' });
        throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
      }
      if (!response.body) {
        setToast({ message: 'Response body is null.', type: 'error' });
        throw new Error('Response body is null.');
      }
      const aiMessagePlaceholder: ChatMessage = { id: `app-${Date.now()}`, type: 'app_response', content: '', created_at: new Date().toISOString() };
      setMessages((prev) => [...prev, aiMessagePlaceholder]);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulated = '';
      let realAIMessageId = '';
      let firstChunkHandled = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          const chunk = decoder.decode(value);
          if (!firstChunkHandled) {
            const newlineIdx = chunk.indexOf('\n');
            if (newlineIdx !== -1) {
              const idChunk = chunk.slice(0, newlineIdx);
              try {
                const parsed = JSON.parse(idChunk);
                if (parsed && parsed.id) {
                  realAIMessageId = String(parsed.id);
                }
              } catch (e) {}
              const rest = chunk.slice(newlineIdx + 1);
              accumulated += rest;
              setMessages((prev) => prev.map((msg, idx) =>
                idx === prev.length - 1 ? { ...msg, id: realAIMessageId || msg.id, content: rest } : msg
              ));
              firstChunkHandled = true;
            } else {
              accumulated += chunk;
              setMessages((prev) => prev.map((msg, idx) =>
                idx === prev.length - 1 ? { ...msg, content: accumulated } : msg
              ));
            }
          } else {
            accumulated += chunk;
            setMessages((prev) => prev.map((msg, idx) =>
              idx === prev.length - 1 ? { ...msg, content: accumulated } : msg
            ));
          }
        }
      }
      const { data: { session: postSession } } = await supabase.auth.getSession();
      if (postSession?.access_token) {
        const response = await fetch('/api/chat/history?limit=100', {
          headers: {
            'Authorization': `Bearer ${postSession.access_token}`,
            'Accept': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.messages)) {
            setMessages(data.messages.reverse());
          }
        }
      }
    } catch (error) {
      const errorResponse: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'app_response',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response. Please check the console.'}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsWaitingForResponse(false);
    }
  };

  const handleRetryLastResponse = (userPrompt: string) => {
    handleSendMessage(userPrompt);
  };

  const handleManualRefresh = async () => {
    // Implementation needed
  };

  return {
    messages,
    setMessages,
    isWaitingForResponse,
    suggestions,
    fetchSuggestions,
    suggestLoading,
    handleSendMessage,
    handleRetryLastResponse,
    handleManualRefresh,
  };
} 