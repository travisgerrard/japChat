"use client";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import VocabRow from "./VocabRow";

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

export default function VocabPage() {
  const [vocab, setVocab] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Vocabulary Learned</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">Error: {error}</div>}
      {!loading && !error && (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="p-2 text-left">Word</th>
              <th className="p-2 text-left">Reading</th>
              <th className="p-2 text-left">Meaning</th>
              <th className="p-2 text-left">Kanji</th>
              <th className="p-2 text-left">SRS Level</th>
              <th className="p-2 text-left">Next Review</th>
              <th className="p-2 text-left">Context</th>
            </tr>
          </thead>
          <tbody>
            {vocab.map((item) => (
              <VocabRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 