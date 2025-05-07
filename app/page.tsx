'use client'; // <-- Make this a Client Component

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
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

  // Handler for scroll position change (must be top-level)
  const handleScrollBottomChange = useCallback((atBottom: boolean) => {
    setIsAtBottom(atBottom);
  }, []);

  // Fetch suggestions from backend when input is blank and at bottom (must be top-level)
  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch('/api/suggest-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to fetch suggestions');
      const data = await res.json();
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
    } catch {
      setSuggestions([]);
    }
  }, []);

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

  const handleSendMessage = async (messageContent: string) => {
    if (!user) return; // Should not happen if auth check works

    setIsWaitingForResponse(true);
    setImporting(false);

   // --- Call the API Route ---
   try {
     // Get session for auth token
     const { data: { session }, error: sessionError } = await supabase.auth.getSession();
     if (sessionError || !session || !session.access_token) {
       console.error('Error getting session/token for sending message:', sessionError);
       throw new Error("Authentication error: Could not get session token.");
     }

     // Add placeholder for AI response
     const aiMessagePlaceholder: ChatMessage = { id: `app-${Date.now()}`, type: 'app_response', content: '', created_at: new Date().toISOString() };
     // setMessages((prevMessages) => [...prevMessages, aiMessagePlaceholder]);

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
           // The first chunk should be the JSON with the real message ID
           const newlineIdx = chunk.indexOf('\n');
           if (newlineIdx !== -1) {
             const idChunk = chunk.slice(0, newlineIdx);
             try {
               const parsed = JSON.parse(idChunk);
               if (parsed && parsed.id) {
                 realAIMessageId = String(parsed.id);
                 // Update the placeholder message to use the real ID
                 // setMessages(currentMessages => {
                 //   const updated = [...currentMessages];
                 //   const placeholderIndex = updated.findIndex(msg => msg.id === aiMessagePlaceholder.id);
                 //   if (placeholderIndex !== -1) {
                 //     updated[placeholderIndex] = {
                 //       ...updated[placeholderIndex],
                 //       id: realAIMessageId,
                 //       content: '',
                 //     };
                 //   }
                 //   return updated;
                 // });
               }
             } catch (e) {
               console.error('Failed to parse real AI message ID from stream:', e);
             }
             // The rest of the chunk (after the newline) is the start of the AI response
             const rest = chunk.slice(newlineIdx + 1);
             // Only accumulate and display the rest (skip the idChunk)
             accumulated += rest;
             // Check for start of JSON block
             const jsonStart = accumulated.indexOf('"""json') !== -1 ? accumulated.indexOf('"""json') : accumulated.indexOf('```json');
             let displayAccum = accumulated;
             if (jsonStart !== -1) {
               displayAccum = accumulated.slice(0, jsonStart);
               done = true; // Stop streaming further
             }
             // setMessages(currentMessages => {
             //   const updated = [...currentMessages];
             //   const placeholderIndex = updated.findIndex(msg => msg.id === (realAIMessageId ? realAIMessageId : aiMessagePlaceholder.id));
             //   if (placeholderIndex !== -1) {
             //     updated[placeholderIndex] = {
             //       ...updated[placeholderIndex],
             //       content: displayAccum,
             //     };
             //   }
             //   return updated;
             // });
             firstChunkHandled = true;
           } else {
             // If the first chunk does not contain a newline, accumulate until it does
             accumulated += chunk;
           }
         } else {
           accumulated += chunk;
           // Check for start of JSON block
           const jsonStartIdx = accumulated.indexOf('"""json') !== -1 ? accumulated.indexOf('"""json') : accumulated.indexOf('```json');
           let displayAccum = accumulated;
           if (jsonStartIdx !== -1) {
             displayAccum = accumulated.slice(0, jsonStartIdx);
             // Show snackbar as soon as JSON block starts
             setShowImportingSnackbar(true);
             done = true; // Stop streaming further
           }
           // setMessages(currentMessages => {
           //   const updated = [...currentMessages];
           //   const placeholderIndex = updated.findIndex(msg => msg.id === (realAIMessageId ? realAIMessageId : aiMessagePlaceholder.id));
           //   if (placeholderIndex !== -1) {
           //     updated[placeholderIndex] = {
           //       ...updated[placeholderIndex],
           //       content: displayAccum,
           //     };
           //   }
           //   return updated;
           // });
         }
       }
     }

     // --- After streaming: Remove JSON block from chat window and parse it ---
     // Show snackbar while importing JSON
     setShowImportingSnackbar(true);
     // Look for triple double quotes ("""json ... """) or triple backticks (```json ... ```)
     let displayText = accumulated;
     let jsonBlock = '';
     // Try triple double quotes first
     const tripleQuoteStart = accumulated.indexOf('"""json');
     if (tripleQuoteStart !== -1) {
       const tripleQuoteEnd = accumulated.indexOf('"""', tripleQuoteStart + 7);
       if (tripleQuoteEnd !== -1) {
         jsonBlock = accumulated.slice(tripleQuoteStart + 7, tripleQuoteEnd).trim();
         displayText = accumulated.slice(0, tripleQuoteStart).trim();
       }
     } else {
       // Fallback: try triple backticks
       const tripleBacktickStart = accumulated.indexOf('```json');
       if (tripleBacktickStart !== -1) {
         const tripleBacktickEnd = accumulated.indexOf('```', tripleBacktickStart + 7);
         if (tripleBacktickEnd !== -1) {
           jsonBlock = accumulated.slice(tripleBacktickStart + 7, tripleBacktickEnd).trim();
           displayText = accumulated.slice(0, tripleBacktickStart).trim();
         }
       }
     }
     // Update the chat window to remove the JSON block
     // setMessages(currentMessages => {
     //   const updated = [...currentMessages];
     //   const placeholderIndex = updated.findIndex(msg => msg.id === (realAIMessageId ? realAIMessageId : aiMessagePlaceholder.id));
     //   if (placeholderIndex !== -1) {
     //     updated[placeholderIndex] = {
     //       ...updated[placeholderIndex],
     //       content: displayText,
     //     };
     //   }
     //   return updated;
     // });
     // Parse and use the JSON for SRS/vocab/grammar, etc.
     if (jsonBlock) {
       try {
         const parsedJSON = JSON.parse(jsonBlock);
         setLastParsedJSON(parsedJSON); // Save for retry
         setImporting(true);
         const { data: { session } } = await supabase.auth.getSession();
         if (session && session.access_token) {
           try {
             const importRes = await fetch('/api/ai-story-import', {
               method: 'POST',
               headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${session.access_token}`,
               },
               body: JSON.stringify(parsedJSON),
             });
             setImporting(false);
             setShowImportingSnackbar(false); // Hide snackbar on completion
             if (importRes.ok) {
               const result = await importRes.json();
               // Store new SRS IDs for highlighting
               storeNewSRSIds(
                 (parsedJSON.vocab_notes as Record<string, unknown>[]),
                 (parsedJSON.grammar_notes as Record<string, unknown>[])
               );
               const vocabCount = Array.isArray(parsedJSON.vocab_notes) ? parsedJSON.vocab_notes.length : 0;
               const grammarCount = Array.isArray(parsedJSON.grammar_notes) ? parsedJSON.grammar_notes.length : 0;
               setToast({
                 message: `Imported: ${parsedJSON.title} (Vocab: ${vocabCount}, Grammar: ${grammarCount})`,
                 type: 'success',
                 retryFn: null,
               });
             } else {
               const err = await importRes.json();
               setToast({
                 message: `Import failed: ${err.error || 'Unknown error'}`,
                 type: 'error',
                 retryFn: () => retryImport(),
               });
               // Log details
               console.error('[SRS/AI JSON] Import failed:', err, { payload: parsedJSON });
             }
           } catch (err) {
             setImporting(false);
             setShowImportingSnackbar(false); // Hide snackbar on error
             setToast({ message: 'Import failed: Network error', type: 'error', retryFn: () => retryImport() });
             // Log details
             console.error('[SRS/AI JSON] Import network error:', err, { payload: parsedJSON });
           }
         } else {
           setImporting(false);
           setShowImportingSnackbar(false); // Hide snackbar on error
           setToast({ message: 'Import failed: No session token', type: 'error', retryFn: () => retryImport() });
           // Log details
           console.error('[SRS/AI JSON] No session token for import', { payload: parsedJSON });
         }
       } catch (e) {
         setImporting(false);
         setShowImportingSnackbar(false); // Hide snackbar on error
         setToast({ message: 'Import failed: Invalid JSON block', type: 'error', retryFn: () => retryImport() });
         // Log details
         console.error('Failed to parse AI JSON block or import:', e, jsonBlock);
       }
     } else {
       setShowImportingSnackbar(false); // Hide snackbar if no JSON block
     }

   } catch (error) {
     console.error("Failed to send message or get response:", error);
     const errorResponse: ChatMessage = {
       id: `error-${Date.now()}`,
       type: 'app_response', // Display as an app message
       content: `Error: ${error instanceof Error ? error.message : 'Failed to get response. Please check the console.'}`,
       created_at: new Date().toISOString(),
     };
     // setMessages((prevMessages) => [...prevMessages, errorResponse]);
   } finally {
     setIsWaitingForResponse(false); // Ensure loading state is turned off
   }
  };

  // Add a handler for retrying the last response
  const handleRetryLastResponse = (userPrompt: string) => {
    // setMessages((prevMessages) => {
    //   // Remove the last app_response message
    //   const lastAppResponseIdx = [...prevMessages].reverse().findIndex(m => m.type === 'app_response');
    //   if (lastAppResponseIdx === -1) return prevMessages;
    //   const idxToRemove = prevMessages.length - 1 - lastAppResponseIdx;
    //   const updated = prevMessages.slice(0, idxToRemove).concat(prevMessages.slice(idxToRemove + 1));
    //   return updated;
    // });
    handleSendMessage(userPrompt);
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
        } else {
          const err = await importRes.json();
          setToast({
            message: `Import failed: ${err.error || 'Unknown error'}`,
            type: 'error',
            retryFn: () => retryImport(),
          });
          console.error('[SRS/AI JSON] Retry import failed:', err, { payload: lastParsedJSON });
        }
      } else {
        setImporting(false);
        setToast({ message: 'Import failed: No session token', type: 'error', retryFn: () => retryImport() });
        console.error('[SRS/AI JSON] Retry: No session token for import', { payload: lastParsedJSON });
      }
    } catch (err) {
      setImporting(false);
      setToast({ message: 'Import failed: Network error', type: 'error', retryFn: () => retryImport() });
      console.error('[SRS/AI JSON] Retry import network error:', err, { payload: lastParsedJSON });
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
