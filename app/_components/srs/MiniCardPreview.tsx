import React, { useState, useRef, useEffect, ReactNode } from "react";

interface MiniCardPreviewProps {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function MiniCardPreview({ trigger, children, className }: MiniCardPreviewProps) {
  const [show, setShow] = useState(false);
  const [pinned, setPinned] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);

  // Card hover/toggle logic
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

  // Dismiss sticky card on outside click
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
        <div className={`absolute z-20 left-0 mt-2 w-72 bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-4 border border-gray-200 dark:border-gray-700 animate-fade-in transition-all duration-200 ${className || ''}`}
          style={{ boxShadow: '0 4px 24px 0 rgba(0,0,0,0.10)' }}
          tabIndex={-1}
          aria-modal="true"
          role="dialog"
        >
          {children}
        </div>
      )}
    </span>
  );
} 