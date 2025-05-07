"use client";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useMemo } from "react";
import SRSCard from "../_components/srs/SRSCard";
import GrammarRow from './GrammarRow';
import useSWR from 'swr';

interface GrammarItem {
  id: string;
  grammar_point: string;
  explanation: string;
  example_sentence?: string;
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

export default function GrammarPage() {
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
    if (!res.ok) throw new Error("Failed to fetch grammar");
    const data = await res.json();
    return data.grammar || [];
  };
  const { data: grammar = [], error, isLoading, mutate } = useSWR('/api/grammar', fetcher);
  const [contextStates, setContextStates] = useState<Record<string, { examples: ExampleLink[]; loading: boolean }>>({});
  const [sortBy, setSortBy] = useState('point-asc');

  const sortedGrammar = useMemo(() => {
    const arr = [...grammar];
    switch (sortBy) {
      case 'point-asc':
        arr.sort((a, b) => a.grammar_point.localeCompare(b.grammar_point, 'ja'));
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
  }, [grammar, sortBy]);

  const handleContextOpen = async (item: GrammarItem) => {
    if (contextStates[item.id]?.loading || contextStates[item.id]?.examples !== undefined) return;
    setContextStates((prev) => ({ ...prev, [item.id]: { examples: [], loading: true } }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const res = await fetch(`/api/grammar-story-links?grammar_point=${encodeURIComponent(item.grammar_point)}`, {
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
      <h1 className="text-2xl font-bold mb-6">Grammar Learned</h1>
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <label htmlFor="grammar-sort" className="font-medium">Sort by:</label>
        <select id="grammar-sort" value={sortBy} onChange={e => setSortBy(e.target.value)} className="border rounded px-2 py-1">
          <option value="point-asc">Grammar Point (A-Z)</option>
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
          {sortedGrammar.map((item) => (
            <SRSCard
              key={item.id}
              id={item.id}
              type="grammar"
              grammar_point={item.grammar_point}
              explanation={item.explanation}
              example_sentence={item.example_sentence}
              srs_level={item.srs_level}
              next_review={item.next_review}
              chat_message_id={item.chat_message_id}
              contextExamples={contextStates[item.id]?.examples || []}
              contextLoading={contextStates[item.id]?.loading || false}
              onContextOpen={() => handleContextOpen(item)}
              mutateGrammar={mutate}
            />
          ))}
        </div>
      )}
    </div>
  );
} 