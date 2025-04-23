import React, { useState, useRef, useEffect } from "react";
import SrsBadge from "../_components/srs/SrsBadge";
import MiniCardPreview from "../_components/srs/MiniCardPreview";
import ExamplePopover from "../_components/srs/ExamplePopover";
import { createClient } from '@/lib/supabase/client';

interface VocabItem {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  kanji?: string;
  srs_level: number;
  next_review: string;
  chat_message_id?: string;
  usage_sentence?: string;
  usage_translation?: string;
  kanji_radicals?: string; // optional
}

const supabase = createClient();

function playAudio(word: string) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    const jaVoice = voices.find(v => v.name?.toLowerCase().includes('kyoko')) || voices.find(v => v.lang?.toLowerCase().startsWith('ja')) || null;
    const utter = new window.SpeechSynthesisUtterance(word);
    utter.lang = 'ja-JP';
    if (jaVoice) utter.voice = jaVoice;
    synth.cancel(); // Stop any current speech
    synth.speak(utter);
  }
}

export default function VocabRow({ item }: { item: VocabItem }) {
  const [showCard, setShowCard] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [showRadical, setShowRadical] = useState(false);
  const [radicalHover, setRadicalHover] = useState(false);
  const [tooltipHover, setTooltipHover] = useState(false);
  const [radicalPinned, setRadicalPinned] = useState(false);
  const [cardPinned, setCardPinned] = useState(false);
  const radicalTimeout = useRef<NodeJS.Timeout | null>(null);
  const exampleRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const radicalRef = useRef<HTMLSpanElement>(null);
  const [examples, setExamples] = useState([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [loadingExamples, setLoadingExamples] = useState(false);

  // Card hover logic
  useEffect(() => {
    if (cardPinned) {
      setShowCard(true);
      return;
    }
    if (showCard) {
      // allow hover/focus to show
      setShowCard(true);
    } else {
      setShowCard(false);
    }
  }, [cardPinned, showCard]);

  // Dismiss sticky card on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        cardPinned &&
        wordRef.current &&
        !wordRef.current.contains(e.target as Node)
      ) {
        setCardPinned(false);
        setShowCard(false);
      }
      // existing logic for example/radical...
      if (
        showExample &&
        exampleRef.current &&
        !exampleRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest('[data-example-btn]')
      ) {
        setShowExample(false);
      }
      if (
        radicalPinned &&
        radicalRef.current &&
        !radicalRef.current.contains(e.target as Node)
      ) {
        setRadicalPinned(false);
        setShowRadical(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowCard(false);
        setCardPinned(false);
        setShowExample(false);
        setShowRadical(false);
        setRadicalPinned(false);
      }
    }
    if (showExample || showCard || showRadical || radicalPinned || cardPinned) {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showExample, showCard, showRadical, radicalPinned, cardPinned]);

  // Tooltip hover logic
  useEffect(() => {
    if (radicalPinned) {
      setShowRadical(true);
      return;
    }
    if (radicalHover || tooltipHover) {
      setShowRadical(true);
      if (radicalTimeout.current) clearTimeout(radicalTimeout.current);
    } else {
      radicalTimeout.current = setTimeout(() => setShowRadical(false), 400);
    }
    return () => {
      if (radicalTimeout.current) clearTimeout(radicalTimeout.current);
    };
  }, [radicalHover, tooltipHover, radicalPinned]);

  // Dismiss sticky tooltip on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        radicalPinned &&
        radicalRef.current &&
        !radicalRef.current.contains(e.target as Node)
      ) {
        setRadicalPinned(false);
        setShowRadical(false);
      }
    }
    if (radicalPinned) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [radicalPinned]);

  // Example data
  const exampleJapanese = item.usage_sentence || `公園で${item.word}ました`;
  const exampleEnglish = item.usage_translation || `I ${item.meaning} at the park`;

  const fetchExamples = async () => {
    if (hasFetched || loadingExamples) return;
    setLoadingExamples(true);
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) {
      console.warn('No Supabase access token found. User may not be authenticated.');
      setExamples([]);
      setHasFetched(true);
      setLoadingExamples(false);
      return;
    }
    const res = await fetch(`/api/vocab-story-links?vocab_word=${encodeURIComponent(item.word)}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      setExamples((data.links || []).map((link: { example_sentence?: string; chat_message_id: string }) => ({
        exampleJapanese: link.example_sentence ? highlightWord(link.example_sentence, item.word) : '',
        exampleEnglish: '',
        contextLinks: [{ label: 'View in Chat', href: `/chat/context/${link.chat_message_id}` }],
      })));
      setHasFetched(true);
    }
    setLoadingExamples(false);
  };

  function highlightWord(sentence: string, word: string) {
    if (!word) return sentence;
    // Only highlight the first occurrence
    const idx = sentence.indexOf(word);
    if (idx === -1) return sentence;
    return (
      <>
        {sentence.slice(0, idx)}<mark className="bg-yellow-200 dark:bg-yellow-700 rounded px-1 py-0.5">{word}</mark>{sentence.slice(idx + word.length)}
      </>
    );
  }

  return (
    <tr className="border-b transition-colors hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 group">
      <td className="p-3 relative">
        <MiniCardPreview
          trigger={
            <span
              ref={wordRef}
              tabIndex={0}
              className="cursor-pointer font-medium hover:underline focus:underline outline-none"
              aria-label={`Show details for ${item.word}`}
              role="button"
            >
              {item.word}
            </span>
          }
        >
          <div className="text-3xl font-extrabold mb-2">{item.word}</div>
          <div className="text-lg text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-2 h-8">
            <span className="flex items-center h-full">{item.reading}</span>
            <button
              className="ml-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 rounded-full text-xs font-semibold hover:bg-indigo-200 dark:hover:bg-indigo-800"
              onClick={() => playAudio(item.word)}
              tabIndex={0}
              aria-label={`Play audio for ${item.word}`}
              role="button"
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') playAudio(item.word);
              }}
            >
              🔊
            </button>
          </div>
          <div className="text-base text-gray-600 dark:text-gray-300 mb-2">{item.meaning}</div>
          {/* Distinct stroke badge with radical tooltip */}
          <div className="flex gap-2 mb-2 items-center">
            <span
              ref={radicalRef}
              className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full px-3 py-1 text-xs font-bold shadow-sm border border-yellow-200 dark:border-yellow-800 cursor-help relative outline-none"
              onMouseEnter={() => setRadicalHover(true)}
              onMouseLeave={() => setRadicalHover(false)}
              onFocus={() => setRadicalHover(true)}
              onBlur={() => setRadicalHover(false)}
              tabIndex={0}
              aria-label={`Show kanji radicals for ${item.word}`}
              role="button"
              onClick={() => {
                setRadicalPinned((v) => !v);
                setShowRadical((v) => !v);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setRadicalPinned((v) => !v);
                  setShowRadical((v) => !v);
                }
                if (e.key === 'Escape') {
                  setRadicalPinned(false);
                  setShowRadical(false);
                }
              }}
            >
              Strokes: ?
              {showRadical && (
                <span
                  className="absolute left-1/2 top-full mt-0 -translate-x-1/2 w-52 min-h-[2.5rem] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded shadow-lg p-2 text-xs z-40"
                  tabIndex={-1}
                  role="tooltip"
                  onMouseEnter={() => setTooltipHover(true)}
                  onMouseLeave={() => setTooltipHover(false)}
                  onFocus={() => setTooltipHover(true)}
                  onBlur={() => setTooltipHover(false)}
                >
                  {item.kanji_radicals || 'Radicals: (not available)'}
                </span>
              )}
            </span>
          </div>
          {/* Usage sentence if available */}
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 italic">
            {item.usage_sentence ? (
              <>
                {item.usage_sentence}
                <br />
                <span className="not-italic text-gray-400 dark:text-gray-500">{item.usage_translation}</span>
              </>
            ) : 'Usage: (coming soon)'}
          </div>
          {/* SRS badge */}
          <div className="mt-2"><SrsBadge level={item.srs_level} nextReview={item.next_review} /></div>
        </MiniCardPreview>
      </td>
      <td className="p-3 align-middle">
        <div className="flex flex-col items-center justify-center h-full min-h-[2.5rem] gap-1">
          <span className="text-center">{item.reading}</span>
          <button
            className="mt-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 rounded-full text-xs font-semibold hover:bg-indigo-200 dark:hover:bg-indigo-800"
            onClick={() => playAudio(item.word)}
            tabIndex={0}
            aria-label={`Play audio for ${item.word}`}
            role="button"
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') playAudio(item.word);
            }}
          >
            🔊
          </button>
        </div>
      </td>
      <td className="p-3">{item.meaning}</td>
      <td className="p-3">{item.kanji || "-"}</td>
      <td className="p-3"><SrsBadge level={item.srs_level} nextReview={item.next_review} /></td>
      <td className="p-3">{item.next_review ? new Date(item.next_review).toLocaleDateString() : "-"}</td>
      <td className="p-3 relative">
        {item.chat_message_id ? (
          <ExamplePopover
            trigger={
              <button
                className="text-blue-600 hover:underline font-medium"
                tabIndex={0}
                aria-label={`Show example for ${item.word}`}
                role="button"
                data-example-btn
                onClick={() => { setPopoverOpen((v) => !v); fetchExamples(); }}
                onMouseEnter={fetchExamples}
                onFocus={fetchExamples}
              >
                View Example
              </button>
            }
            examples={examples}
            loading={loadingExamples}
          />
        ) : "-"}
      </td>
    </tr>
  );
}