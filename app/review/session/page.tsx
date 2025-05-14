"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import SRSReview from "../SRSReview";
import { createClient } from "../../../lib/supabase/client";
import type { SRSItem } from "../SRSReview";

export default function SRSReviewSessionPage() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") as "vocab" | "grammar" | "both" | null;
  const [queue, setQueue] = useState<SRSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDue() {
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
        if (!res.ok) throw new Error("Failed to fetch due SRS items");
        const data = await res.json();
        const vocab: SRSItem[] = (data.vocab || []).map((v: unknown) => ({ ...(v as SRSItem), type: "vocab" as const }));
        const grammar: SRSItem[] = (data.grammar || []).map((g: unknown) => ({ ...(g as SRSItem), type: "grammar" as const }));
        let all: SRSItem[] = [];
        if (mode === "vocab") all = vocab;
        else if (mode === "grammar") all = grammar;
        else if (mode === "both") {
          // Randomly intermix vocab and grammar
          all = [...vocab, ...grammar].sort(() => Math.random() - 0.5);
        }
        setQueue(all);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchDue();
  }, [mode]);

  if (!mode) return <div className="text-center text-red-500">Invalid review mode.</div>;
  if (loading) return <div className="text-center text-lg">Loading review session…</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;
  if (queue.length === 0) return <div className="text-center text-green-600 font-bold text-xl">No due items for this mode!</div>;

  return <SRSReview initialQueue={queue} mode={mode} />;
} 