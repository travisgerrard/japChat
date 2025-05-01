"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
}

interface CompletionCount {
  total: number;
  completed: number;
}

function extractTitle(markdown: string): string {
  // List of known section headers to skip
  const knownSections = [
    'Japanese Text',
    'English Translation',
    'Vocabulary Notes',
    'Detailed Grammar Discussion',
    'Practice Questions',
    'Usage Tips',
    'Story Title (Japanese with Romaji)'
  ];
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('### ')) {
      // Check if this is a known section header
      const headerText = trimmed.replace(/^###\s*/, '').trim();
      if (!knownSections.some(section => headerText.startsWith(section))) {
        return headerText;
      }
    }
  }
  // Fallback: first non-header, non-separator, non-empty line
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed !== '---') return trimmed;
  }
  return "Untitled Story";
}

export default function SpeakListPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completionCounts, setCompletionCounts] = useState<Record<string, CompletionCount>>({});

  useEffect(() => {
    async function fetchAudioMessages() {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError("Not logged in");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, content, created_at, message_type")
        .eq("user_id", session.user.id)
        .eq("message_type", "app_response")
        .order("created_at", { ascending: false });
      if (error) {
        setError("Failed to fetch audio messages");
        setLoading(false);
        return;
      }
      setMessages(data || []);
      setLoading(false);
    }
    fetchAudioMessages();
  }, []);

  useEffect(() => {
    async function fetchCompletionCounts() {
      if (!messages.length) return;
      const supabase = createClient();
      const counts: Record<string, CompletionCount> = {};
      for (const msg of messages) {
        // Parse sentences from Japanese section
        const jpMatch = msg.content.match(/### Japanese Text\s*\n+([\s\S]+?)(?:\n###|\n---|$)/);
        const japanese = jpMatch ? jpMatch[1].trim() : '';
        const sentences = japanese
          .replace(/\([^)]+\)/g, '') // Remove furigana
          .split(/[。！？!?]/)
          .map(s => s.trim())
          .filter(Boolean);
        // Fetch best scores for this message
        const { data, error } = await supabase
          .from('word_scores')
          .select('sentence_idx, similarity')
          .eq('chat_message_id', msg.id);
        const best: Record<number, number> = {};
        if (!error && data) {
          for (const row of data) {
            if (best[row.sentence_idx] === undefined || row.similarity > best[row.sentence_idx]) {
              best[row.sentence_idx] = row.similarity;
            }
          }
        }
        const completed = Object.values(best).filter(score => score >= 80).length;
        counts[msg.id] = { total: sentences.length, completed };
      }
      setCompletionCounts(counts);
    }
    fetchCompletionCounts();
  }, [messages]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Audio Stories</h1>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && messages.length === 0 && <p>No audio stories found.</p>}
      <ul className="space-y-4">
        {messages.map((msg) => (
          <li key={msg.id} className="bg-white dark:bg-gray-800 rounded shadow p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                {extractTitle(msg.content)}
                {completionCounts[msg.id] && completionCounts[msg.id].total > 0 && (
                  <span className="ml-2 text-base font-normal text-gray-600 dark:text-gray-300 align-middle">
                    ({completionCounts[msg.id].completed} / {completionCounts[msg.id].total} phrases ≥80%)
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{new Date(msg.created_at).toLocaleString()}</div>
            </div>
            <Link href={`/speak/${msg.id}`} className="mt-2 sm:mt-0 inline-block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors font-medium text-center">View & Listen</Link>
          </li>
        ))}
      </ul>
    </div>
  );
} 