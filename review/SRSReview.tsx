"use client";
import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface SRSItem {
  id: string;
  user_id: string;
  srs_level: number;
  next_review: string;
  // Vocab fields
  word?: string;
  reading?: string;
  meaning?: string;
  kanji?: string;
  context_sentence?: string;
  // Grammar fields
  grammar_point?: string;
  explanation?: string;
  example_sentence?: string;
  // Type
  type: "vocab" | "grammar";
}

export default function SRSReview() {
  const supabase = createClient();
  const [queue, setQueue] = useState<SRSItem[]>([]);
  const [current, setCurrent] = useState<SRSItem | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDue() {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        const res = await fetch("/api/srs-due", {
          headers: {
            "Accept": "application/json",
            ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}),
          },
        });
        if (!res.ok) throw new Error("Failed to fetch due SRS items");
        const data = await res.json();
        // Tag each item with its type
        const vocab = (data.vocab || []).map((v: unknown) => ({ ...(v as SRSItem), type: "vocab" as const }));
        const grammar = (data.grammar || []).map((g: unknown) => ({ ...(g as SRSItem), type: "grammar" as const }));
        const all = [...vocab, ...grammar];
        setQueue(all);
        setCurrent(all[0] || null);
        setDone(all.length === 0);
      } catch (err) {
        setError((err instanceof Error ? err.message : "Unknown error"));
      } finally {
        setLoading(false);
      }
    }
    fetchDue();
  }, []);

  async function handleReview(result: "correct" | "incorrect") {
    if (!current) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const res = await fetch("/api/srs-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          item_type: current.type,
          item_id: current.id,
          result,
        }),
      });
      if (!res.ok) throw new Error("Failed to update SRS");
      // Remove current from queue and show next
      const nextQueue = queue.slice(1);
      setQueue(nextQueue);
      setCurrent(nextQueue[0] || null);
      setFlipped(false);
      setDone(nextQueue.length === 0);
    } catch (err) {
      setError((err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (done) return <div className="text-green-600 font-bold text-xl">No more due items! 🎉</div>;
  if (!current) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px]">
      <div
        className={`w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-6 cursor-pointer select-none transition-transform ${flipped ? "rotate-y-180" : ""}`}
        onClick={() => setFlipped((f) => !f)}
        style={{ perspective: 1000 }}
      >
        {/* Card front/back */}
        {!flipped ? (
          <div>
            {current.type === "vocab" ? (
              <>
                <div className="text-3xl font-bold mb-2">{current.word}</div>
                <div className="text-lg text-gray-500 mb-2">{current.kanji}</div>
                <div className="text-base text-gray-400">(Click to reveal meaning & context)</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2">{current.grammar_point}</div>
                <div className="text-base text-gray-400">(Click to reveal explanation & example)</div>
              </>
            )}
          </div>
        ) : (
          <div>
            {current.type === "vocab" ? (
              <>
                <div className="text-xl font-semibold mb-1">{current.reading}</div>
                <div className="text-lg mb-2">{current.meaning}</div>
                <div className="text-gray-600 dark:text-gray-300 mb-2">{current.context_sentence}</div>
                <div className="text-xs text-gray-400">SRS Level: {current.srs_level}</div>
              </>
            ) : (
              <>
                <div className="text-base mb-2">{current.explanation}</div>
                <div className="text-gray-600 dark:text-gray-300 mb-2">{current.example_sentence}</div>
                <div className="text-xs text-gray-400">SRS Level: {current.srs_level}</div>
              </>
            )}
          </div>
        )}
      </div>
      <div className="flex space-x-6">
        <button
          className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded shadow"
          onClick={() => handleReview("correct")}
          disabled={loading}
        >
          Correct
        </button>
        <button
          className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded shadow"
          onClick={() => handleReview("incorrect")}
          disabled={loading}
        >
          Incorrect
        </button>
      </div>
      <div className="mt-4 text-xs text-gray-400">Click the card to flip</div>
    </div>
  );
} 