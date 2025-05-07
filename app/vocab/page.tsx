"use client";
import { createClient } from '../../lib/supabase/client';
import { useEffect, useState, useMemo } from "react";
import SRSCard from "../_components/srs/SRSCard";
import useSWR from 'swr';

interface VocabItem {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  kanji?: string;
  srs_level: number;
  next_review: string;
  chat_message_id?: string;
  created_at?: string;
}

interface ExampleLink {
  exampleJapanese: React.ReactNode;
  exampleEnglish: string;
  contextLinks?: { label: string; href: string }[];
}

export default function VocabPage() {
  const supabase = createClient();
  const fetcher = async (url: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}),
      },
    });
    if (!res.ok) throw new Error("Failed to fetch vocab");
    const data = await res.json();
    return data.vocab || [];
  };
  const { data: vocab = [], error, isLoading, mutate } = useSWR('/api/vocab', fetcher);
  // For context popover state
  const [contextStates, setContextStates] = useState<Record<string, { examples: ExampleLink[]; loading: boolean }>>({});
  const [sortBy, setSortBy] = useState('word-asc');

  const sortedVocab = useMemo(() => {
    const arr = [...vocab];
    switch (sortBy) {
      case 'word-asc':
        arr.sort((a, b) => a.word.localeCompare(b.word, 'ja'));
        break;
      case 'reading-asc':
        arr.sort((a, b) => a.reading.localeCompare(b.reading, 'ja'));
        break;
      case 'srs-desc':
        arr.sort((a, b) => b.srs_level - a.srs_level);
        break;
      case 'srs-asc':
        arr.sort((a, b) => a.srs_level - b.srs_level);
        break;
      case 'review-asc':
        arr.sort((a, b) => new Date(a.next_review).getTime() - new Date(b.next_review).getTime());
        break;
      case 'review-desc':
        arr.sort((a, b) => new Date(b.next_review).getTime() - new Date(a.next_review).getTime());
        break;
      case 'added-desc':
        arr.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      case 'added-asc':
        arr.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
        break;
      default:
        break;
    }
    return arr;
  }, [vocab, sortBy]);

  // Fetch context examples for a vocab word
  const handleContextOpen = async (item: VocabItem) => {
    if (contextStates[item.id]?.loading || contextStates[item.id]?.examples !== undefined) return;
    setContextStates((prev) => ({ ...prev, [item.id]: { examples: [], loading: true } }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const res = await fetch(`/api/vocab-story-links?vocab_word=${encodeURIComponent(item.word)}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      let examples: ExampleLink[] = [];
      if (res.ok) {
        const data = await res.json();
        examples = (data.links || []).map((link: { example_sentence?: string; chat_message_id: string }) => ({
          exampleJapanese: link.example_sentence || '',
          exampleEnglish: '',
          contextLinks: [{ label: 'View in Chat', href: `/chat/context/${link.chat_message_id}` }],
        }));
      }
      setContextStates((prev) => ({ ...prev, [item.id]: { examples, loading: false } }));
    } catch (err) {
      setContextStates((prev) => ({ ...prev, [item.id]: { examples: [], loading: false } }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8 pt-16">
      <h1 className="text-2xl font-bold mb-6">Vocabulary Learned</h1>
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <label htmlFor="vocab-sort" className="font-medium">Sort by:</label>
        <select id="vocab-sort" value={sortBy} onChange={e => setSortBy(e.target.value)} className="border rounded px-2 py-1">
          <option value="word-asc">Word (A-Z)</option>
          <option value="reading-asc">Reading (A-Z)</option>
          <option value="srs-desc">SRS Level (High → Low)</option>
          <option value="srs-asc">SRS Level (Low → High)</option>
          <option value="review-asc">Next Review (Soonest → Latest)</option>
          <option value="review-desc">Next Review (Latest → Soonest)</option>
          <option value="added-desc">Most Recently Added</option>
          <option value="added-asc">Most Distantly Added</option>
        </select>
      </div>
      {isLoading && <div>Loading...</div>}
      {error && <div className="text-red-500">Error: {error.message}</div>}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {sortedVocab.map((item) => (
            <SRSCard
              key={item.id}
              id={item.id}
              type="vocab"
              word={item.word}
              reading={item.reading}
              meaning={item.meaning}
              kanji={item.kanji}
              srs_level={item.srs_level}
              next_review={item.next_review}
              chat_message_id={item.chat_message_id}
              playAudio={(word) => {
                if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                  const synth = window.speechSynthesis;
                  const voices = synth.getVoices();
                  const jaVoice = voices.find(v => v.name?.toLowerCase().includes('kyoko')) || voices.find(v => v.lang?.toLowerCase().startsWith('ja')) || null;
                  const utter = new window.SpeechSynthesisUtterance(word);
                  utter.lang = 'ja-JP';
                  if (jaVoice) utter.voice = jaVoice;
                  synth.cancel();
                  synth.speak(utter);
                }
              }}
              contextExamples={contextStates[item.id]?.examples || []}
              contextLoading={contextStates[item.id]?.loading || false}
              onContextOpen={() => handleContextOpen(item)}
              mutateVocab={mutate}
            />
          ))}
        </div>
      )}
    </div>
  );
} 