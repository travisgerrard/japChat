"use client";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import GrammarRow from "./GrammarRow";

interface GrammarItem {
  id: string;
  grammar_point: string;
  explanation: string;
  example_sentence?: string;
  srs_level: number;
  next_review: string;
  chat_message_id?: string;
}

export default function GrammarPage() {
  const [grammar, setGrammar] = useState<GrammarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8">
      <div className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 w-full">Grammar Learned</div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">Error: {error}</div>}
      {!loading && !error && (
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="p-2 text-left">Grammar Point</th>
                <th className="p-2 text-left">Explanation</th>
                <th className="p-2 text-left">Example Sentence</th>
                <th className="p-2 text-left">SRS Level</th>
                <th className="p-2 text-left">Next Review</th>
                <th className="p-2 text-left">Context</th>
              </tr>
            </thead>
            <tbody>
              {grammar.map((item) => (
                <GrammarRow key={item.id} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 