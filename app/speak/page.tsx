"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
}

function extractTitle(markdown: string): string {
  const match = markdown.match(/### Story Title \(Japanese with Romaji\)\s*\r?\n+([\s\S]+?)(?=\n###)/);
  return match?.[1]?.trim() || "Untitled Story";
}

export default function SpeakListPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
              <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">{extractTitle(msg.content)}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{new Date(msg.created_at).toLocaleString()}</div>
            </div>
            <Link href={`/speak/${msg.id}`} className="mt-2 sm:mt-0 inline-block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors font-medium text-center">View & Listen</Link>
          </li>
        ))}
      </ul>
    </div>
  );
} 