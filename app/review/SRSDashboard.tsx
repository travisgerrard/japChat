"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

interface SRSCounts {
  vocab: number;
  grammar: number;
}

export default function SRSDashboard() {
  const [counts, setCounts] = useState<SRSCounts>({ vocab: 0, grammar: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchCounts() {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        const res = await fetch("/api/srs-due", {
          headers: {
            "Accept": "application/json",
            ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}),
          },
        });
        if (!res.ok) throw new Error("Failed to fetch SRS counts");
        const data = await res.json();
        setCounts({ vocab: (data.vocab || []).length, grammar: (data.grammar || []).length });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchCounts();
  }, []);

  function handleStartReview(mode: "vocab" | "grammar" | "both") {
    // Pass mode as query param to SRSReview
    router.push(`/review/session?mode=${mode}`);
  }

  return (
    <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 flex flex-col gap-8">
      <h2 className="text-3xl font-bold text-center mb-4">SRS Dashboard</h2>
      {loading ? (
        <div className="text-center text-lg">Loading...</div>
      ) : error ? (
        <div className="text-center text-red-500">{error}</div>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex flex-row justify-around gap-4">
            <div className="flex-1 bg-blue-50 dark:bg-blue-950 rounded-xl p-6 flex flex-col items-center">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">Vocabulary</div>
              <div className="text-4xl font-extrabold my-2">{counts.vocab}</div>
              <button
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow text-lg font-semibold"
                onClick={() => handleStartReview("vocab")}
                disabled={counts.vocab === 0}
              >
                Review Vocabulary
              </button>
            </div>
            <div className="flex-1 bg-purple-50 dark:bg-purple-950 rounded-xl p-6 flex flex-col items-center">
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">Grammar</div>
              <div className="text-4xl font-extrabold my-2">{counts.grammar}</div>
              <button
                className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded shadow text-lg font-semibold"
                onClick={() => handleStartReview("grammar")}
                disabled={counts.grammar === 0}
              >
                Review Grammar
              </button>
            </div>
          </div>
          <div className="flex flex-col items-center mt-4">
            <button
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow text-xl font-bold"
              onClick={() => handleStartReview("both")}
              disabled={counts.vocab + counts.grammar === 0}
            >
              Review Both (Random Mix)
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 