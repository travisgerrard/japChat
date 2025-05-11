import { useState } from 'react';

export function useSentenceBreakdown(chat_message_id: string, sentences: string[]) {
  const [breakdowns, setBreakdowns] = useState<(string | null)[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState<boolean[]>([]);
  const [breakdownVisible, setBreakdownVisible] = useState<boolean[]>([]);

  async function fetchBreakdown(idx: number, sentence: string) {
    setBreakdownLoading(prev => {
      const arr = [...prev];
      arr[idx] = true;
      return arr;
    });
    try {
      const res = await fetch('/api/sentence-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_message_id, sentence_idx: idx, sentence_text: sentence }),
      });
      const data = await res.json();
      setBreakdowns(prev => {
        const arr = [...prev];
        arr[idx] = data.breakdown || 'No breakdown available.';
        return arr;
      });
      setBreakdownVisible(prev => {
        const arr = [...prev];
        arr[idx] = true;
        return arr;
      });
    } catch {
      setBreakdowns(prev => {
        const arr = [...prev];
        arr[idx] = 'Failed to fetch breakdown.';
        return arr;
      });
    } finally {
      setBreakdownLoading(prev => {
        const arr = [...prev];
        arr[idx] = false;
        return arr;
      });
    }
  }

  return {
    breakdowns,
    breakdownLoading,
    breakdownVisible,
    setBreakdownVisible,
    fetchBreakdown,
  };
} 