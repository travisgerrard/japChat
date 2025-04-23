'use client'; // <-- Make this a Client Component

import { useState, useEffect, useRef } from 'react';
// import { getUser } from '@/lib/supabase/server'; // No longer needed here
import { createClient } from '@/lib/supabase/client'; // Use client-side client
import { useRouter } from 'next/navigation'; // Use router for redirect
import type { User } from '@supabase/supabase-js'; // Import User type
import Link from 'next/link'; // Add this import for Next.js navigation

import LogoutButton from './_components/LogoutButton';
import ChatInput from './_components/ChatInput';
import ChatWindow, { type ChatMessage } from './_components/ChatWindow'; // Import ChatMessage type

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Loading state for initial auth check
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false); // Loading state for AI response
  const [inputBarHeight, setInputBarHeight] = useState(0); // For dynamic chat area height
  const inputBarRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const [navOpen, setNavOpen] = useState(false); // For mobile menu

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
              setMessages([]); // Start empty if no token
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
            setMessages(historyData);
            console.log("[page.tsx] Messages state updated with history."); // Added log
          } catch (error) {
            console.error("[page.tsx] Error during fetchHistory execution:", error); // Modified log
            setMessages([]); // Start empty on error
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

    const newUserMessage: ChatMessage = {
      id: `user-${Date.now()}`, // Temporary ID
      type: 'user_prompt',
      content: messageContent,
    };

    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setIsWaitingForResponse(true);

   // --- Call the API Route ---
   try {
     // Get session for auth token
     const { data: { session }, error: sessionError } = await supabase.auth.getSession();
     if (sessionError || !session || !session.access_token) {
       console.error('Error getting session/token for sending message:', sessionError);
       throw new Error("Authentication error: Could not get session token.");
     }

     // Add placeholder for AI response
     const aiMessagePlaceholder: ChatMessage = { id: `app-${Date.now()}`, type: 'app_response', content: '' };
     setMessages((prevMessages) => [...prevMessages, aiMessagePlaceholder]);

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
                 setMessages(currentMessages => {
                   const updated = [...currentMessages];
                   const placeholderIndex = updated.findIndex(msg => msg.id === aiMessagePlaceholder.id);
                   if (placeholderIndex !== -1) {
                     updated[placeholderIndex] = {
                       ...updated[placeholderIndex],
                       id: realAIMessageId,
                       content: '',
                     };
                   }
                   return updated;
                 });
               }
             } catch (e) {
               console.error('Failed to parse real AI message ID from stream:', e);
             }
             // The rest of the chunk (after the newline) is the start of the AI response
             const rest = chunk.slice(newlineIdx + 1);
             accumulated += rest;
             setMessages(currentMessages => {
               const updated = [...currentMessages];
               const placeholderIndex = updated.findIndex(msg => msg.id === (realAIMessageId ? realAIMessageId : aiMessagePlaceholder.id));
               if (placeholderIndex !== -1) {
                 updated[placeholderIndex] = {
                   ...updated[placeholderIndex],
                   content: accumulated,
                 };
               }
               return updated;
             });
             firstChunkHandled = true;
           } else {
             // If the first chunk does not contain a newline, accumulate until it does
             accumulated += chunk;
           }
         } else {
           accumulated += chunk;
           setMessages(currentMessages => {
             const updated = [...currentMessages];
             const placeholderIndex = updated.findIndex(msg => msg.id === (realAIMessageId ? realAIMessageId : aiMessagePlaceholder.id));
             if (placeholderIndex !== -1) {
               updated[placeholderIndex] = {
                 ...updated[placeholderIndex],
                 content: accumulated,
               };
             }
             return updated;
           });
         }
       }
     }

   } catch (error) {
     console.error("Failed to send message or get response:", error);
     const errorResponse: ChatMessage = {
       id: `error-${Date.now()}`,
       type: 'app_response', // Display as an app message
       content: `Error: ${error instanceof Error ? error.message : 'Failed to get response. Please check the console.'}`,
     };
     setMessages((prevMessages) => [...prevMessages, errorResponse]);
   } finally {
     setIsWaitingForResponse(false); // Ensure loading state is turned off
   }
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

  // Render page content only if user is authenticated (checked in useEffect)
  return (
    user && (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-5xl flex flex-col rounded-xl shadow-lg bg-white dark:bg-gray-800 overflow-hidden">
          {/* Chat Area */}
          <div className="flex-grow overflow-y-auto p-4 min-h-[300px] max-h-[70vh]">
            <ChatWindow messages={messages} isLoading={isWaitingForResponse} />
          </div>
          {/* Input Bar */}
          <div className="bg-white dark:bg-gray-800 px-4 py-3">
            <ChatInput onSubmit={handleSendMessage} isLoading={isWaitingForResponse} />
          </div>
        </div>
      </div>
    )
  );
}
