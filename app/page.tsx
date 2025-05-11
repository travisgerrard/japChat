'use client'; // <-- Make this a Client Component

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '../lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import ChatInput from './_components/ChatInput';
import ChatWindow, { type ChatMessage } from './_components/ChatWindow';
import Header from './_components/Header';

// Simple Toast component
function Toast({ message, type, onClose, retryFn }: { message: string, type: 'success' | 'error', onClose: () => void, retryFn?: (() => void) | null }) {
  return (
    <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded shadow-lg z-50 ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
      onClick={onClose}
    >
      <span>{message}</span>
      {type === 'error' && retryFn && (
        <button
          className="ml-4 px-3 py-1 rounded bg-yellow-500 text-white font-bold text-xs hover:bg-yellow-600 transition-colors"
          onClick={e => { e.stopPropagation(); retryFn(); }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [inputBarHeight, setInputBarHeight] = useState(0);
  const inputBarRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error', retryFn?: (() => void) | null } | null>(null);
  const [importing, setImporting] = useState(false);
  const [lastParsedJSON, setLastParsedJSON] = useState<Record<string, unknown> | null>(null);
  const [showImportingSnackbar, setShowImportingSnackbar] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Handler for scroll position change (must be top-level)
  const handleScrollBottomChange = useCallback((atBottom: boolean) => {
    setIsAtBottom(atBottom);
  }, []);

  // Fetch suggestions from backend when input is blank and at bottom (must be top-level)
  const fetchSuggestions = useCallback(async () => {
    // Get last 5 user prompts from chat history (if available)
    let context = '';
    try {
      // Use only local messages state for suggestions
      // Filter for user prompts, sort by created_at ascending
      const userPrompts = messages
        .filter((msg) => msg.type === 'user_prompt')
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      // Get last 5
      const lastN = userPrompts.slice(-5).map((msg) => msg.content);
      context = lastN.join('\n');
    } catch (e: unknown) {
      // If any error, just use blank context
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

  // Lock scroll to chat area
  useEffect(() => {
    if (typeof document !== 'undefined' && document.body && document.documentElement) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, []);

  // Check authentication status on component mount
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Session object:", session); // Log the session object
      if (!session?.user) {
        router.push('/login');
      } else {
        setUser(session.user);

        // Ensure user exists in custom users table
        try {
          const { data: existingUser, error: userFetchError } = await supabase
            .from('users')
            .select('id')
            .eq('id', session.user.id)
            .maybeSingle();
          if (!existingUser) {
            const { error: insertError } = await supabase
              .from('users')
              .insert({ id: session.user.id, email: session.user.email });
            if (insertError) {
              console.error('[users] Error inserting user into custom users table:', insertError);
            } else {
              console.log('[users] Inserted user into custom users table:', session.user.id);
            }
          }
        } catch (err) {
          console.error('[users] Error checking/inserting user into custom users table:', err);
        }

        // Fetch initial chat history
        const fetchHistory = async () => {
          console.log("[page.tsx] Fetching chat history..."); // Log start
          try {
            if (!session?.access_token) {
              console.error("[page.tsx] No access token found in session for fetching history.");
              return;
            }
            console.log("[page.tsx] Access token found. Preparing history fetch..."); // Added log

            const historyHeaders = new Headers();
            historyHeaders.append('Authorization', `Bearer ${session.access_token}`);
            historyHeaders.append('Accept', 'application/json');

            console.log("[page.tsx] Calling fetch('/api/chat/history')..."); // Added log
            const response = await fetch('/api/chat/history', {
              method: 'GET',
              headers: historyHeaders,
            });
            console.log("[page.tsx] History fetch call completed. Status:", response.status); // Added log

            if (!response.ok) {
              const errorBody = await response.text();
              console.error("[page.tsx] History fetch response not OK. Body:", errorBody); // Added log
              throw new Error(`Failed to fetch history: ${response.status} ${errorBody}`);
            }

            console.log("[page.tsx] History fetch response OK. Parsing JSON..."); // Added log
            const historyData: ChatMessage[] = await response.json();
            console.log("[page.tsx] Chat history data received:", historyData); // Log fetched data
          } catch (error) {
            console.error("[page.tsx] Error during fetchHistory execution:", error); // Modified log
          }
        };

        await fetchHistory(); // Call the history fetch function

      }
      setIsLoading(false); // Finished initial check
    };
    checkUser();

    // Optional: Listen for auth changes (e.g., if token expires)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          setUser(null);
          router.push('/login');
        } else {
          // Update user state if it changes (e.g., profile update)
          // Avoid unnecessary state updates if user is the same
          setUser(prevUser => JSON.stringify(prevUser) !== JSON.stringify(session.user) ? session.user : prevUser);
        }
      }
    );

    // Cleanup listener on component unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router]);

  // Effect: update input bar height on mount and resize
  useEffect(() => {
    function updateHeight() {
      if (inputBarRef.current) {
        setInputBarHeight(inputBarRef.current.offsetHeight);
      }
    }
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

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
        setMessages(data.messages.reverse()); // newest last
      }
    };
    if (user) fetchMessages();
  }, [user]);

  const handleSendMessage = async (messageContent: string) => {
    if (!user) return;
    setIsWaitingForResponse(true);
    setImporting(false);

    // Add user prompt optimistically
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user_prompt',
      content: messageContent,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // Get session for auth token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session || !session.access_token) {
        console.error('Error getting session/token for sending message:', sessionError);
        throw new Error("Authentication error: Could not get session token.");
      }

      // Prepare and log *before* fetch
      const requestBody = JSON.stringify({ message: messageContent });
      console.log("Sending message content:", messageContent); // Log 1
      console.log("Sending body:", requestBody); // Log 2
      console.log("Access Token:", session.access_token); // Log access token
      const apiHeaders = new Headers();
      apiHeaders.append('Content-Type', 'application/json');
      apiHeaders.append('Authorization', `Bearer ${session.access_token}`);
      apiHeaders.append('Accept', 'application/json');

      // Call the backend API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: apiHeaders,
        body: requestBody,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
      }

      if (!response.body) {
        throw new Error('Response body is null.');
      }

      // Add placeholder for AI response
      const aiMessagePlaceholder: ChatMessage = { id: `app-${Date.now()}`, type: 'app_response', content: '', created_at: new Date().toISOString() };
      setMessages((prev) => [...prev, aiMessagePlaceholder]);

      // --- STREAMING HANDLING ---
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
              } catch (e) {
                console.error('Failed to parse real AI message ID from stream:', e);
              }
              const rest = chunk.slice(newlineIdx + 1);
              accumulated += rest;
              // Update placeholder with first chunk
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

      // After streaming is done:
      // Fetch messages again
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
      // On error, show error message in chat
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

  // Add a handler for retrying the last response
  const handleRetryLastResponse = (userPrompt: string) => {
    handleSendMessage(userPrompt);
  };

  // Handler for manual refresh
  const handleManualRefresh = async () => {
    // Implementation needed
  };

  // Show loading indicator during initial auth check
  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
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

  // Retry import function
  async function retryImport() {
    if (!lastParsedJSON) return;
    setImporting(true);
    setToast(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.access_token) {
        const importRes = await fetch('/api/ai-story-import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(lastParsedJSON),
        });
        setImporting(false);
        setShowImportingSnackbar(false); // Hide snackbar on completion
        if (importRes.ok) {
          const result = await importRes.json();
          storeNewSRSIds(
            (lastParsedJSON.vocab_notes as Record<string, unknown>[]),
            (lastParsedJSON.grammar_notes as Record<string, unknown>[])
          );
          const vocabCount = Array.isArray(lastParsedJSON.vocab_notes) ? lastParsedJSON.vocab_notes.length : 0;
          const grammarCount = Array.isArray(lastParsedJSON.grammar_notes) ? lastParsedJSON.grammar_notes.length : 0;
          setToast({
            message: `Imported: ${lastParsedJSON.title} (Vocab: ${vocabCount}, Grammar: ${grammarCount})`,
            type: 'success',
            retryFn: null,
          });
          // --- NEW: Clear local chat state and revalidate SWR ---
          setMessages([]);
        } else {
          const err = await importRes.json();
          setToast({
            message: `Import failed: ${err.error || 'Unknown error'}`,
            type: 'error',
            retryFn: () => retryImport(),
          });
          console.error('[SRS/AI JSON] Import failed:', err, { payload: lastParsedJSON });
        }
      } else {
        setImporting(false);
        setShowImportingSnackbar(false); // Hide snackbar on error
        setToast({ message: 'Import failed: No session token', type: 'error', retryFn: () => retryImport() });
        console.error('[SRS/AI JSON] No session token for import', { payload: lastParsedJSON });
      }
    } catch (err) {
      setImporting(false);
      setToast({ message: 'Import failed: Network error', type: 'error', retryFn: () => retryImport() });
      console.error('[SRS/AI JSON] Import network error:', err, { payload: lastParsedJSON });
    }
  }

  // Render page content only if user is authenticated (checked in useEffect)
  return (
    user && (
      <>
        <Header email={user.email ?? null} />
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-900">
          <div className="w-full max-w-5xl flex flex-col overflow-hidden h-full pt-16">
            {/* Chat Area - only scrollable region */}
            <div className="flex-grow overflow-y-auto p-4 min-h-[300px] h-full pb-16">
              <ChatWindow
                isLoading={isWaitingForResponse}
                onRetryLastResponse={handleRetryLastResponse}
                onScrollBottomChange={handleScrollBottomChange}
                messages={messages}
              />
            </div>
          </div>
          {/* Input Bar - floating at the bottom, always visible */}
          <ChatInput
            onSubmit={handleSendMessage}
            isLoading={isWaitingForResponse || importing}
            disabled={importing}
            suggestions={suggestions}
            fetchSuggestions={fetchSuggestions}
            isAtBottom={isAtBottom}
            suggestLoading={suggestLoading}
          />
          {showImportingSnackbar && (
            <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-50">
              <div className="flex items-center space-x-2 bg-indigo-700 text-white px-4 py-2 rounded shadow-lg animate-fade-in">
                <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                <span>Finalizing story import…</span>
              </div>
            </div>
          )}
          {importing && (
            <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50">
              <div className="flex items-center space-x-2 bg-gray-800 text-white px-4 py-2 rounded shadow-lg">
                <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                <span>Importing SRS items...</span>
              </div>
            </div>
          )}
          {toast && (
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} retryFn={toast.retryFn} />
          )}
        </div>
      </>
    )
  );
}
