import React, { useEffect, useState } from "react";
import SrsBadge from "../_components/srs/SrsBadge";
import MiniCardPreview from "../_components/srs/MiniCardPreview";
import ExamplePopover from "../_components/srs/ExamplePopover";
import { createClient } from '@/lib/supabase/client';

interface GrammarItem {
  id: string;
  grammar_point: string;
  explanation: string;
  example_sentence?: string;
  srs_level: number;
  next_review: string;
  chat_message_id?: string;
}

const supabase = createClient();

export default function GrammarRow({ item }: { item: GrammarItem }) {
  const [examples, setExamples] = useState([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [loadingExamples, setLoadingExamples] = useState(false);

  const fetchExamples = async () => {
    if (hasFetched || loadingExamples) return;
    setLoadingExamples(true);
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    const res = await fetch(`/api/grammar-story-links?grammar_point=${encodeURIComponent(item.grammar_point)}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      setExamples((data.links || []).map((link: { example_sentence?: string; chat_message_id: string }) => ({
        exampleJapanese: link.example_sentence ? highlightGrammar(link.example_sentence, item.grammar_point) : '',
        exampleEnglish: '',
        contextLinks: [{ label: 'View in Chat', href: `/chat/context/${link.chat_message_id}` }],
      })));
      setHasFetched(true);
    }
    setLoadingExamples(false);
  };

  function highlightGrammar(sentence: string, grammar: string) {
    if (!grammar) return sentence;
    const idx = sentence.indexOf(grammar);
    if (idx === -1) return sentence;
    return (
      <>
        {sentence.slice(0, idx)}<mark className="bg-yellow-200 dark:bg-yellow-700 rounded px-1 py-0.5">{grammar}</mark>{sentence.slice(idx + grammar.length)}
      </>
    );
  }

  return (
    <tr className="border-b">
      <td className="p-2">
        <MiniCardPreview
          trigger={
            <span
              tabIndex={0}
              className="cursor-pointer font-medium hover:underline focus:underline outline-none"
              aria-label={`Show details for ${item.grammar_point}`}
              role="button"
            >
              {item.grammar_point}
            </span>
          }
        >
          <div className="text-2xl font-extrabold mb-2">{item.grammar_point}</div>
          <div className="text-base text-gray-700 dark:text-gray-200 mb-2">{item.explanation}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 italic">{item.example_sentence || 'No example yet.'}</div>
          <div className="mt-2"><SrsBadge level={item.srs_level} nextReview={item.next_review} /></div>
        </MiniCardPreview>
      </td>
      <td className="p-2">{item.explanation}</td>
      <td className="p-2">{item.example_sentence || "-"}</td>
      <td className="p-2"><SrsBadge level={item.srs_level} nextReview={item.next_review} /></td>
      <td className="p-2">{item.next_review ? new Date(item.next_review).toLocaleDateString() : "-"}</td>
      <td className="p-2">
        {item.chat_message_id ? (
          <ExamplePopover
            label={`View Example`}
            examples={examples}
            loading={loadingExamples}
          />
        ) : "-"}
      </td>
    </tr>
  );
} 