import { useState } from 'react';
import { normalizeToHiragana } from '../../app/util/jisho';

export function useHiragana(sentences: string[]) {
  const [hiragana, setHiragana] = useState<(string | null)[]>([]);
  const [hiraganaLoading, setHiraganaLoading] = useState<boolean[]>([]);
  const [hiraganaVisible, setHiraganaVisible] = useState<boolean[]>([]);

  async function handleShowHiragana(idx: number) {
    if (hiragana[idx]) {
      setHiraganaVisible(prev => {
        const arr = [...prev];
        arr[idx] = !arr[idx];
        return arr;
      });
      return;
    }
    setHiraganaLoading(prev => {
      const arr = [...prev];
      arr[idx] = true;
      return arr;
    });
    const hira = await normalizeToHiragana(sentences[idx]);
    setHiragana(prev => {
      const arr = [...prev];
      arr[idx] = hira;
      return arr;
    });
    setHiraganaVisible(prev => {
      const arr = [...prev];
      arr[idx] = true;
      return arr;
    });
    setHiraganaLoading(prev => {
      const arr = [...prev];
      arr[idx] = false;
      return arr;
    });
  }

  return {
    hiragana,
    hiraganaLoading,
    hiraganaVisible,
    handleShowHiragana,
    setHiragana,
    setHiraganaLoading,
    setHiraganaVisible,
  };
} 