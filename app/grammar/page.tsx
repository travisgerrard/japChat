"use client";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import SRSCard from "../_components/srs/SRSCard";

interface GrammarItem {
  id: string;
  grammar_point: string;
  explanation: string;
  example_sentence?: string;
  srs_level: number;
  next_review: string;
  chat_message_id?: string;
}

interface ExampleLink {
  exampleJapanese: React.ReactNode;
  exampleEnglish: string;
  contextLinks?: { label: string; href: string }[];
}

export default function GrammarPage() {
  const [grammar, setGrammar] = useState<GrammarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contextStates, setContextStates] = useState<Record<string, { examples: ExampleLink[]; loading: boolean }>>({});

  useEffect(() => {
    async function fetchGrammar() {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        const res = await fetch("/api/grammar", {
          headers: {
            "Accept": "application/json",
            ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}),
          },
        });
        if (!res.ok) throw new Error("Failed to fetch grammar");
        const data = await res.json();
        setGrammar(data.grammar || []);
      } catch (err) {
        setError((err instanceof Error ? err.message : "Unknown error"));
      } finally {
        setLoading(false);
      }
    }
    fetchGrammar();
  }, []);

  const handleContextOpen = async (item: GrammarItem) => {
    if (contextStates[item.id]?.loading || contextStates[item.id]?.examples !== undefined) return;
    setContextStates((prev) => ({ ...prev, [item.id]: { examples: [], loading: true } }));
    try {
      const supabase = createClient();
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
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">Error: {error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {grammar.map((item) => (
            <SRSCard
              key={item.id}
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
            />
          ))}
        </div>
      )}
    </div>
  );
} 