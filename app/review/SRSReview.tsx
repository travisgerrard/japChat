"use client";
import React, { useEffect, useState } from "react";
import { createClient } from '../../lib/supabase/client';
import "./SRSReview.css";

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
  story_usage?: string;
  label?: string;
  narrative_connection?: string;
}

interface SRSReviewProps {
  initialQueue?: SRSItem[];
  mode?: "vocab" | "grammar" | "both";
}

export default function SRSReview({ initialQueue, mode }: SRSReviewProps = {}) {
  const supabase = createClient();
  const [queue, setQueue] = useState<SRSItem[]>(initialQueue || []);
  const [current, setCurrent] = useState<SRSItem | null>(initialQueue && initialQueue.length > 0 ? initialQueue[0] : null);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(!initialQueue);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hintRevealed, setHintRevealed] = useState(false);
  // Track items answered incorrectly this session
  const [incorrectSet, setIncorrectSet] = useState<Set<string>>(new Set());
  const [highlightIds, setHighlightIds] = useState<string[]>([]);
  const [nextDue, setNextDue] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);

  useEffect(() => {
    if (initialQueue) return; // Skip fetch if queue provided
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
        const vocab = (data.vocab || []).map((v: unknown) => ({ ...(v as SRSItem), type: "vocab" as const }));
        const grammar = (data.grammar || []).map((g: unknown) => ({ ...(g as SRSItem), type: "grammar" as const }));
        let all: SRSItem[] = [];
        if (mode === "vocab") all = vocab;
        else if (mode === "grammar") all = grammar;
        else if (mode === "both") all = [...vocab, ...grammar].sort(() => Math.random() - 0.5);
        else all = [...vocab, ...grammar];
        setQueue(all);
        setCurrent(all[0] || null);
        setFlipped(false);
        setHintRevealed(false);
        setDone(all.length === 0);
        setNextDue(data.nextDue || null);
      } catch (err) {
        setError((err instanceof Error ? err.message : "Unknown error"));
      } finally {
        setLoading(false);
      }
    }
    fetchDue();
  }, [initialQueue, mode]);

  // On mount, read new SRS IDs from localStorage and clear after first review
  useEffect(() => {
    const ids = localStorage.getItem('newSRSIds');
    if (ids) {
      try {
        setHighlightIds(JSON.parse(ids));
        // Optionally clear after a short delay or after first review
        setTimeout(() => {
          localStorage.removeItem('newSRSIds');
        }, 10000); // Clear after 10 seconds
      } catch {}
    }
  }, []);

  // Countdown timer for next due item
  useEffect(() => {
    if (!done || !nextDue) return;
    function updateCountdown() {
      if (!nextDue) return;
      const now = new Date();
      const due = new Date(nextDue);
      const diff = due.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown('Now!');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${hours}h ${minutes}m ${seconds}s`);
    }
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [done, nextDue]);

  useEffect(() => {
    if (done && nextDue) {
      setShowCountdown(false);
      const timer = setTimeout(() => setShowCountdown(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setShowCountdown(false);
    }
  }, [done, nextDue]);

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
      let nextQueue = queue.slice(1);
      const nextIncorrectSet = new Set(incorrectSet);
      if (result === "correct") {
        // Remove from incorrect set if present
        nextIncorrectSet.delete(current.id);
        setIncorrectSet(nextIncorrectSet);
        // Only remove from queue if correct (already done by slice)
      } else {
        // If not already marked incorrect this session, re-queue at end
        if (!incorrectSet.has(current.id)) {
          nextQueue = [...nextQueue, current];
          nextIncorrectSet.add(current.id);
        }
        setIncorrectSet(nextIncorrectSet);
      }
      setQueue(nextQueue);
      setCurrent(nextQueue[0] || null);
      setFlipped(false);
      setHintRevealed(false);
      setDone(nextQueue.length === 0);
    } catch (err) {
      setError((err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (done) return (
    <div className="text-green-600 font-bold text-xl flex flex-col items-center">
      No more due items! 🎉
      <div className="text-gray-500 text-lg mt-2">
        {nextDue && countdown && showCountdown ? (
          <>Next review in: <span className="font-mono">{countdown}</span></>
        ) : (
          <span>No upcoming reviews scheduled.</span>
        )}
      </div>
    </div>
  );
  if (!current) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-4xl mx-auto">
      {/* Progress counter */}
      <div className="mb-4 text-lg font-semibold text-gray-700 dark:text-gray-200 text-center w-full">
        {current && (
          `${(initialQueue ? initialQueue.length - queue.length + 1 : 1)} of ${initialQueue ? initialQueue.length : queue.length + (done ? 1 : 0)}`
        )}
      </div>
      {/* Type badge */}
      {current && (
        <div className="mb-2 flex justify-center w-full">
          <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow ${current.type === 'vocab' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{current.type === 'vocab' ? 'Vocabulary' : 'Grammar'}</span>
        </div>
      )}
      <div className="w-full flex justify-center mb-10" style={{ perspective: 1200 }}>
        <div
          className={`relative w-full max-w-xl ${highlightIds.includes(current.id) ? 'ring-4 ring-green-400 animate-pulse' : ''}`}
          style={{ height: '340px' }}
        >
          <div
            className={`absolute w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? '[transform:rotateY(180deg)]' : ''}`}
            onClick={() => setFlipped((f) => !f)}
          >
            {/* Card front */}
            <div className="absolute w-full h-full flex flex-col justify-center items-center [backface-visibility:hidden] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl shadow-lg px-8 py-10 transition-colors duration-300">
            {current.type === "vocab" ? (
              <>
                  <div className="text-5xl font-extrabold mb-6">{current.word}</div>
                  <div className="text-lg font-medium text-gray-800 mb-4">
                    <span className="font-bold">{current.kanji}</span>
                    {current.kanji && current.reading ? ' ' : ''}
                    <span className="font-normal">{current.reading}</span>
                  </div>
                  <div className="text-base text-gray-500 mb-2">Click to reveal meaning & context</div>
              </>
            ) : (
              <>
                  <div className="text-5xl font-extrabold mb-6">{current.grammar_point}</div>
                  {/* Show Hint button for story usage */}
                  {current.story_usage && !flipped && !hintRevealed && (
                    <button
                      className="mb-2 px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-semibold hover:bg-gray-300 focus:outline-none"
                      onClick={e => { e.stopPropagation(); setHintRevealed(true); }}
                    >
                      Show Hint
                    </button>
                  )}
                  {current.story_usage && hintRevealed && !flipped && (
                    <div className="mb-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded text-gray-800 text-sm font-medium shadow-inner">
                      <span className="font-semibold">Hint:</span> {current.story_usage}
                    </div>
                  )}
                  <div className="text-base text-gray-500 mb-2">Click to reveal explanation & example</div>
              </>
            )}
          </div>
            {/* Card back */}
            <div className="absolute w-full h-full flex flex-col justify-center items-center [backface-visibility:hidden] [transform:rotateY(180deg)] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl shadow-lg px-8 py-10 transition-colors duration-300">
            {current.type === "vocab" ? (
              <>
                  <div className="text-5xl font-extrabold mb-6">{current.word}</div>
                  <div className="text-xl font-semibold mb-2">{current.reading}</div>
                <div className="text-lg mb-2">{current.meaning}</div>
                  <div className="text-gray-600 dark:text-gray-200 mb-4">{current.context_sentence}</div>
                <div className="text-xs text-gray-400">SRS Level: {current.srs_level}</div>
              </>
            ) : (
              <>
                  <div className="text-4xl font-extrabold mb-2">{current.grammar_point} <span className="text-lg font-semibold text-gray-500">({current.label})</span></div>
                <div className="text-base mb-2">{current.explanation}</div>
                  {current.story_usage && (
                    <div className="text-gray-700 dark:text-gray-200 mb-2"><span className="font-semibold">Story Usage:</span> {current.story_usage}</div>
                  )}
                  {current.narrative_connection && (
                    <div className="text-gray-700 dark:text-gray-200 mb-2"><span className="font-semibold">Narrative Connection:</span> {current.narrative_connection}</div>
                  )}
                <div className="text-xs text-gray-400">SRS Level: {current.srs_level}</div>
              </>
            )}
          </div>
          </div>
        </div>
      </div>
      <div className="flex flex-row justify-center items-center space-x-8 mt-2">
        <button
          className="w-48 py-4 text-xl font-bold bg-green-500 hover:bg-green-600 text-white rounded-xl shadow"
          onClick={() => handleReview('correct')}
          disabled={loading}
        >
          Correct
        </button>
        <button
          className="w-48 py-4 text-xl font-bold bg-red-500 hover:bg-red-600 text-white rounded-xl shadow"
          onClick={() => handleReview('incorrect')}
          disabled={loading}
        >
          Incorrect
        </button>
      </div>
    </div>
  );
} 