import React, { useState, useRef, useEffect, ReactNode } from "react";

interface ExampleLink {
  exampleJapanese: React.ReactNode;
  exampleEnglish: string;
  contextLinks?: { label: string; href: string }[];
}

interface ExamplePopoverProps {
  trigger: ReactNode;
  examples: ExampleLink[];
  loading?: boolean;
  className?: string;
}

export default function ExamplePopover({ trigger, examples, loading, className }: ExamplePopoverProps) {
  const [show, setShow] = useState(false);
  const [pinned, setPinned] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (pinned) {
      setShow(true);
      return;
    }
    if (show) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [pinned, show]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        pinned &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setPinned(false);
        setShow(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShow(false);
        setPinned(false);
      }
    }
    if (show || pinned) {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [show, pinned]);

  return (
    <span
      ref={triggerRef}
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => { if (!pinned) setShow(false); }}
      onFocus={() => setShow(true)}
      onBlur={() => { if (!pinned) setShow(false); }}
      tabIndex={0}
      onClick={() => { setPinned((v) => !v); setShow((v) => !v); }}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') { setPinned((v) => !v); setShow((v) => !v); }
        if (e.key === 'Escape') { setPinned(false); setShow(false); }
      }}
    >
      {trigger}
      {show && (
        <div className={`absolute z-30 mt-2 bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-4 border border-gray-200 dark:border-gray-700 animate-fade-in transition-all duration-200 w-[90vw] max-w-xs right-0 left-auto sm:left-0 sm:right-auto sm:w-80 ${className || ''}`}
          style={{ boxShadow: '0 4px 24px 0 rgba(0,0,0,0.10)' }}
          tabIndex={-1}
          aria-modal="true"
          role="dialog"
        >
          <div className="mb-2 text-gray-900 dark:text-gray-100 font-bold">Examples in context:</div>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
              Loading examples…
            </div>
          ) : examples.length === 0 ? (
            <div className="text-gray-500 italic">No examples found.</div>
          ) : (
            examples.map((ex, i) => (
              <div key={i} className="mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 last:border-b-0 last:mb-0">
                <div className="mb-1 text-lg text-gray-800 dark:text-gray-200">{ex.exampleJapanese}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{ex.exampleEnglish}</div>
                {ex.contextLinks && ex.contextLinks.length > 0 && (
                  <div className="mt-1 space-x-2">
                    {ex.contextLinks.map((link, j) => (
                      <a key={j} href={link.href} className="text-indigo-600 dark:text-indigo-300 hover:underline text-xs">{link.label}</a>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </span>
  );
} 