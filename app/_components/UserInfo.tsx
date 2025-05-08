"use client";
import { useState, useRef, useEffect } from 'react';
import LogoutButton from './LogoutButton';

export default function UserInfo({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!email) return null;

  return (
    <div className="relative ml-4" ref={dropdownRef}>
      <button
        className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-200 dark:bg-indigo-700 text-indigo-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open profile menu"
      >
        {email ? email[0].toUpperCase() : '?'}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 animate-fade-in">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="font-semibold text-gray-900 dark:text-gray-100">Profile</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{email}</div>
          </div>
          <div className="px-4 py-2">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
} 