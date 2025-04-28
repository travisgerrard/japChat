"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface AudioSRSItem {
  id: string;
  user_id: string;
  word_id: number;
  srs_level: number;
  next_review: string;
  best_score: number | null;
  last_practiced_at: string | null;
  word?: string;
}

export default function AudioSRSReview() {
  const supabase = createClient();
  const [queue, setQueue] = useState<AudioSRSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track items answered incorrectly this session
  const [incorrectSet, setIncorrectSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchDue() {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) throw new Error("Not logged in");
        // Step 1: Fetch due audio review items
        const { data: audioItems, error: audioError } = await supabase
          .from("audio_review_queue")
          .select("*")
          .eq("user_id", userId)
          .lte("next_review", new Date().toISOString())
          .order("next_review", { ascending: true });
        if (audioError) throw audioError;
        // Step 2: Fetch all words for those word_ids
        const wordIds = (audioItems || []).map((item: AudioSRSItem) => item.word_id);
        let wordsMap: Record<number, string> = {};
        if (wordIds.length > 0) {
          const { data: words, error: wordsError } = await supabase
            .from("words")
            .select("id, text").in("id", wordIds);
          if (wordsError) throw wordsError;
          wordsMap = Object.fromEntries((words || []).map((w: { id: number, text: string }) => [w.id, w.text]));
        }
        // Step 3: Merge
        const items = (audioItems || []).map((item: AudioSRSItem) => ({
          ...item,
          word: wordsMap[item.word_id] || "[Unknown]",
        }));
        setQueue(items);
        setIncorrectSet(new Set()); // Reset incorrect set for new session
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    fetchDue();
  }, [supabase]);

  async function handleReview(item: AudioSRSItem, result: "correct" | "incorrect") {
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
          item_type: "audio",
          item_id: item.id,
          result,
        }),
      });
      if (!res.ok) throw new Error("Failed to update SRS");
      let nextQueue = queue.filter(q => q.id !== item.id);
      const nextIncorrectSet = new Set(incorrectSet);
      if (result === "correct") {
        nextIncorrectSet.delete(item.id);
        setIncorrectSet(nextIncorrectSet);
        // Only remove from queue if correct (already done by filter)
      } else {
        if (!incorrectSet.has(item.id)) {
          nextQueue = [...nextQueue, item];
          nextIncorrectSet.add(item.id);
        }
        setIncorrectSet(nextIncorrectSet);
      }
      setQueue(nextQueue);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (queue.length === 0) return <div className="text-green-600 font-bold text-xl">No audio items due! 🎉</div>;

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto mt-8 pt-16">
      <h2 className="text-2xl font-bold mb-6">Audio SRS Review</h2>
      <ul className="w-full space-y-4">
        {queue.map((item) => (
          <li key={item.id} className="bg-white dark:bg-gray-800 rounded shadow p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">{item.word}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Next review: {new Date(item.next_review).toLocaleString()}</div>
              {item.best_score !== null && (
                <div className="text-xs text-green-700 dark:text-lime-300">Best Score: {item.best_score}%</div>
              )}
            </div>
            <div className="flex flex-col gap-2 mt-2 sm:mt-0">
              <Link href={`/speak/word/${item.word_id}`} className="inline-block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors font-medium text-center">Practice</Link>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 bg-green-500 text-white rounded shadow hover:bg-green-600 font-bold"
                  onClick={() => handleReview(item, "correct")}
                  disabled={loading}
                >
                  Correct
                </button>
                <button
                  className="px-4 py-2 bg-red-500 text-white rounded shadow hover:bg-red-600 font-bold"
                  onClick={() => handleReview(item, "incorrect")}
                  disabled={loading}
                >
                  Incorrect
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
} 