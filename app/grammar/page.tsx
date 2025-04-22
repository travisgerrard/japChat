"use client";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

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
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Grammar Learned</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">Error: {error}</div>}
      {!loading && !error && (
        <table className="w-full border-collapse">
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
              <tr key={item.id} className="border-b">
                <td className="p-2">{item.grammar_point}</td>
                <td className="p-2">{item.explanation}</td>
                <td className="p-2">{item.example_sentence || "-"}</td>
                <td className="p-2">{item.srs_level}</td>
                <td className="p-2">{item.next_review ? new Date(item.next_review).toLocaleDateString() : "-"}</td>
                <td className="p-2">
                  {item.chat_message_id ? (
                    <a href={`/chat/context/${item.chat_message_id}`} className="text-blue-600 hover:underline">View in Chat</a>
                  ) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 