"use client";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";

function computeSimilarity(a: string, b: string): number {
  // Simple similarity: percent of matching characters (can be improved)
  if (!a || !b) return 0;
  let matches = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) matches++;
  }
  return Math.round((matches / Math.max(a.length, b.length)) * 100);
}

export default function WordAudioPracticePage() {
  const params = useParams() ?? {};
  const word_id = (params as { word_id?: string }).word_id as string;
  const [word, setWord] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recognized, setRecognized] = useState<string>("");
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchWordAndScore() {
      setLoading(true);
      setError(null);
      // Fetch word
      const { data: wordData, error: wordError } = await supabase
        .from("words")
        .select("text")
        .eq("id", word_id)
        .maybeSingle();
      if (wordError) setError(wordError.message);
      else setWord(wordData?.text || "");
      // Fetch best score
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (userId) {
        const { data: scoreRows } = await supabase
          .from("word_scores")
          .select("similarity")
          .eq("user_id", userId)
          .eq("word_id", word_id)
          .order("similarity", { ascending: false })
          .limit(1);
        if (scoreRows && scoreRows.length > 0) setBestScore(scoreRows[0].similarity);
      }
      setLoading(false);
    }
    if (word_id) fetchWordAndScore();
  }, [word_id, supabase]);

  function handleRecord() {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech Recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setRecognized(transcript);
      const sim = computeSimilarity(transcript, word);
      setSimilarity(sim);
      saveScore(sim, transcript);
      setRecording(false);
    };
    recognition.onerror = (event: any) => {
      setError("Speech recognition error: " + event.error);
      setRecording(false);
    };
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    setRecording(true);
    recognition.start();
  }

  async function saveScore(sim: number, transcript: string) {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;
    const { error: insertError } = await supabase.from("word_scores").insert({
      user_id: userId,
      word_id: word_id,
      sentence: word,
      recognized_transcript: transcript,
      similarity: sim,
      sentence_idx: 0,
      created_at: new Date().toISOString(),
    });
    if (insertError) setError("Failed to save score: " + insertError.message);
    // Refetch best score
    const { data: scoreRows } = await supabase
      .from("word_scores")
      .select("similarity")
      .eq("user_id", userId)
      .eq("word_id", word_id)
      .order("similarity", { ascending: false })
      .limit(1);
    if (scoreRows && scoreRows.length > 0) setBestScore(scoreRows[0].similarity);
  }

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Practice Word Pronunciation</h1>
      <div className="text-4xl font-extrabold mb-4">{word}</div>
      <button
        className={`px-4 py-2 rounded text-white font-bold ${recording ? "bg-yellow-500" : "bg-blue-600 hover:bg-blue-700"}`}
        onClick={handleRecord}
      >
        {recording ? "Listening... (tap to stop)" : "Record"}
      </button>
      {recognized && (
        <div className="mt-4">
          <div className="text-lg">Recognized: <span className="font-semibold">{recognized}</span></div>
          {similarity !== null && (
            <div className="text-green-700 dark:text-lime-300">Similarity: {similarity}%</div>
          )}
        </div>
      )}
      {bestScore !== null && (
        <div className="mt-4 text-xs text-green-700 dark:text-lime-300">Best Score: {bestScore}%</div>
      )}
    </div>
  );
} 