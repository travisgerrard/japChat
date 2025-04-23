import React, { useState, useEffect, ReactNode } from "react";
import { useFloating, offset, flip, shift, useClick, useHover, useRole, useDismiss, useInteractions, FloatingPortal, autoPlacement } from '@floating-ui/react-dom-interactions';

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
  const [pinned, setPinned] = useState(false);

  const { x, y, reference, floating, strategy, context } = useFloating({
    open,
    onOpenChange: setOpen,
    middleware: [offset(8), autoPlacement({ alignment: 'start', allowedPlacements: ['top', 'bottom', 'left', 'right'] }), shift({ padding: 8 })],
  });

  const click = useClick(context);
  const hover = useHover(context, { move: false });
  const role = useRole(context, { role: 'dialog' });
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    hover,
    role,
    dismiss,
  ]);

  // Pinning logic for click-to-stick
  useEffect(() => {
    if (!open) setPinned(false);
  }, [open]);

  useEffect(() => {
    if (open && onOpen) onOpen();
  }, [open, onOpen]);

  return (
    <>
      <button
        ref={reference}
        className="text-blue-600 hover:underline font-medium"
        tabIndex={0}
        aria-label={label}
        role="button"
        data-example-btn
        {...getReferenceProps({
          onClick: () => setPinned((v) => !v),
          onKeyDown: e => {
            if (e.key === 'Enter' || e.key === ' ') setPinned((v) => !v);
            if (e.key === 'Escape') { setPinned(false); setOpen(false); }
          },
        })}
      >
        {label}
      </button>
      {open && x != null && y != null && (
        <FloatingPortal>
          <div
            ref={floating}
            {...getFloatingProps({
              className: `z-50 max-w-xs w-80 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-4 border border-gray-200 dark:border-gray-700 animate-fade-in transition-all duration-200 ${className || ''}`,
              style: {
                position: strategy,
                top: y ?? 0,
                left: x ?? 0,
                boxShadow: '0 4px 24px 0 rgba(0,0,0,0.10)',
                wordBreak: 'break-word',
              },
              tabIndex: -1,
              'aria-modal': 'true',
              role: 'dialog',
            })}
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
        </FloatingPortal>
      )}
    </>
  );
} 