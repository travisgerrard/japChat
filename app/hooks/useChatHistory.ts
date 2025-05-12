import { useState, useEffect, useCallback } from 'react';
import type { User, SupabaseClient } from '@supabase/supabase-js';
import type { ChatMessage } from '../_components/ChatWindow';

export function useChatHistory(user: User | null, supabase: SupabaseClient) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
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
  }, [user, supabase]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { messages, setMessages, refreshHistory: fetchHistory };
} 