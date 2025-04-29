import { useState, useCallback } from 'react';
import { fetchJishoReading } from '../util/jisho';

export function useJishoReading() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<string | null>(null);

  const getReading = useCallback(async (word: string) => {
    setLoading(true);
    setError(null);
    setReading(null);
    try {
      const result = await fetchJishoReading(word);
      setReading(result);
    } catch (e) {
      setError('Failed to fetch reading');
    } finally {
      setLoading(false);
    }
  }, []);

  return { reading, loading, error, getReading };
} 