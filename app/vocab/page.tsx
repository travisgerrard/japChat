"use client";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import SRSCard from "../_components/srs/SRSCard";

interface VocabItem {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  kanji?: string;
  srs_level: number;
  next_review: string;
  chat_message_id?: string;
}

interface ExampleLink {
  exampleJapanese: React.ReactNode;
  exampleEnglish: string;
  contextLinks?: { label: string; href: string }[];
}

export default function VocabPage() {
  const [vocab, setVocab] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // For context popover state
  const [contextStates, setContextStates] = useState<Record<string, { examples: ExampleLink[]; loading: boolean }>>({});

  useEffect(() => {
    async function fetchVocab() {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        const res = await fetch("/api/vocab", {
          headers: {
            "Accept": "application/json",
            ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}),
          },
        });
        if (!res.ok) throw new Error("Failed to fetch vocab");
        const data = await res.json();
        setVocab(data.vocab || []);
      } catch (err) {
        setError((err instanceof Error ? err.message : "Unknown error"));
      } finally {
        setLoading(false);
      }
    }
    fetchVocab();
  }, []);

  // Fetch context examples for a vocab word
  const handleContextOpen = async (item: VocabItem) => {
    if (contextStates[item.id]?.examples?.length || contextStates[item.id]?.loading) return;
    setContextStates((prev) => ({ ...prev, [item.id]: { examples: [], loading: true } }));
    const supabase = createClient();
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
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Vocabulary Learned</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">Error: {error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {vocab.map((item) => (
            <SRSCard
              key={item.id}
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
            />
          ))}
        </div>
      )}
    </div>
  );
} 