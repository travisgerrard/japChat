import React, { useState, useRef, useEffect } from "react";
import ReactDOM from 'react-dom';

interface ExampleLink {
  exampleJapanese: React.ReactNode;
  exampleEnglish: string;
  contextLinks?: { label: string; href: string }[];
}

interface ExamplePopoverProps {
  label?: string;
  examples: ExampleLink[];
  loading?: boolean;
  className?: string;
  onOpen?: () => void;
}

export default function ExamplePopover({ label = 'View Example', examples, loading, className, onOpen }: ExamplePopoverProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const [popoverEl, setPopoverEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverStyle({
        position: 'absolute',
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        zIndex: 9999,
      });
      if (onOpen) onOpen();
    }
  }, [open, onOpen]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (open && buttonRef.current) {
        const popover = document.getElementById('manual-popover');
        if (popover && !popover.contains(e.target as Node) && !buttonRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open]);

  // Portal popover content
  const popoverContent = open ? (
    <div
      id="manual-popover"
      style={popoverStyle}
      className={`z-50 max-w-xs w-80 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-4 border border-gray-200 dark:border-gray-700 animate-fade-in transition-all duration-200 ${className || ''}`}
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
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        className="text-blue-600 hover:underline font-medium"
        tabIndex={0}
        aria-label={label}
        role="button"
        data-example-btn
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') setOpen((v) => !v);
          if (e.key === 'Escape') setOpen(false);
        }}
      >
        {label}
      </button>
      {typeof window !== 'undefined' && open && ReactDOM.createPortal(popoverContent, document.body)}
    </>
  );
} 