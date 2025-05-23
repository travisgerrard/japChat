import React from "react";
import SrsBadge from "./SrsBadge";
import ExamplePopover from "./ExamplePopover";
import useSWR from 'swr';
import { createClient } from '../../../lib/supabase/client';

interface ExampleLink {
  exampleJapanese: React.ReactNode;
  exampleEnglish: string;
  contextLinks?: { label: string; href: string }[];
}

interface SRSCardProps {
  id?: string;
  type: "vocab" | "grammar";
  word?: string;
  reading?: string;
  meaning?: string;
  kanji?: string;
  grammar_point?: string;
  label?: string;
  explanation?: string;
  example_sentence?: React.ReactNode;
  srs_level: number;
  next_review: string;
  chat_message_id?: string;
  playAudio?: (word: string) => void;
  contextExamples?: ExampleLink[];
  contextLoading?: boolean;
  onContextOpen?: () => void;
  mutateVocab?: () => void;
  mutateGrammar?: () => void;
}

export default function SRSCard({
  id,
  type,
  word,
  reading,
  meaning,
  kanji,
  grammar_point,
  label,
  explanation,
  example_sentence,
  srs_level,
  next_review,
  chat_message_id,
  playAudio,
  contextExamples = [],
  contextLoading = false,
  onContextOpen,
  mutateVocab,
  mutateGrammar,
}: SRSCardProps) {
  const supabase = createClient();
  const [showDelete, setShowDelete] = React.useState(false);

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm(`Are you sure you want to delete this ${type} entry?`)) return;
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    const endpoint = type === 'vocab' ? `/api/vocab/${id}` : `/api/grammar/${id}`;
    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    if (res.ok) {
      if (type === 'vocab') {
        if (mutateVocab) mutateVocab();
      } else {
        if (mutateGrammar) mutateGrammar();
      }
    } else {
      alert(`Failed to delete ${type} entry.`);
    }
  };

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-2 w-full max-w-md mx-auto mb-6 group relative"
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      onTouchStart={() => setShowDelete((v) => !v)}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
          {type === "vocab" ? "Vocabulary" : "Grammar"}
        </span>
        {type === "grammar" && label && (
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-300">({label})</span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {type === "vocab" ? (
          <>
            <div className="text-3xl font-extrabold">{word}</div>
            <div className="text-lg text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <span>{reading}</span>
              {playAudio && word && (
                <button
                  className="ml-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 rounded-full text-xs font-semibold hover:bg-indigo-200 dark:hover:bg-indigo-800"
                  onClick={() => playAudio(word)}
                  tabIndex={0}
                  aria-label={`Play audio for ${word}`}
                  role="button"
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') playAudio(word);
                  }}
                >
                  🔊
                </button>
              )}
            </div>
            <div className="text-base text-gray-600 dark:text-gray-300">{meaning}</div>
            {kanji && <div className="text-sm text-gray-500 dark:text-gray-400">Kanji: {kanji}</div>}
          </>
        ) : (
          <>
            <div className="text-3xl font-extrabold">{grammar_point}</div>
            <div className="text-base text-gray-700 dark:text-gray-200">{explanation}</div>
          </>
        )}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-200 italic mt-2">
        {example_sentence}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <SrsBadge level={srs_level} nextReview={next_review} />
        <span className="text-xs text-gray-400">Next: {next_review ? new Date(next_review).toLocaleDateString() : "-"}</span>
      </div>
      <div className="mt-2">
        {chat_message_id && (
          <ExamplePopover
            label="View Example"
            examples={contextExamples}
            loading={contextLoading}
            onOpen={onContextOpen}
          />
        )}
      </div>
      {(type === 'grammar' || type === 'vocab') && showDelete && (
        <button
          className="absolute top-2 right-2 bg-red-600 text-white rounded px-3 py-1 text-xs font-bold shadow hover:bg-red-700 transition"
          onClick={handleDelete}
          aria-label={`Delete ${type} entry`}
        >
          Delete
        </button>
      )}
    </div>
  );
} 