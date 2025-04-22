"use client";
import Link from 'next/link';
import { useState } from 'react';
import UserInfo from './UserInfo';

export default function Header() {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <header className="w-full bg-white dark:bg-gray-800 shadow z-50 sticky top-0">
      <div className="max-w-5xl mx-auto flex flex-row justify-between items-center px-4 py-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Jap-Chat
        </h1>
        {/* Hamburger for mobile */}
        <div className="flex items-center sm:hidden">
          <button
            className="ml-2 p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={() => setNavOpen(!navOpen)}
            aria-label="Toggle navigation menu"
          >
            <svg className="w-6 h-6 text-gray-900 dark:text-gray-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        {/* Desktop Nav */}
        <nav className="hidden sm:flex flex-row items-center gap-4">
          <Link href="/" className="flex items-center px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-900 dark:text-gray-100 transition-colors">
            <span role="img" aria-label="Chat" className="mr-1">💬</span> Chat
          </Link>
          <Link href="/speak" className="flex items-center px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-900 dark:text-gray-100 transition-colors">
            <span role="img" aria-label="Audio" className="mr-1">🔊</span> Audio
          </Link>
          <Link href="/review" className="flex items-center px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-900 dark:text-gray-100 transition-colors">
            <span role="img" aria-label="SRS Review" className="mr-1">📖</span> SRS
          </Link>
          <Link href="/vocab" className="flex items-center px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-900 dark:text-gray-100 transition-colors">
            <span role="img" aria-label="Vocab Review" className="mr-1">🈳</span> Vocab
          </Link>
          <Link href="/grammar" className="flex items-center px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-900 dark:text-gray-100 transition-colors">
            <span role="img" aria-label="Grammar Review" className="mr-1">📝</span> Grammar
          </Link>
          <UserInfo />
        </nav>
      </div>
      {/* Mobile Dropdown Menu */}
      {navOpen && (
        <div className="sm:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-md px-4 py-4 flex flex-col gap-4 animate-fade-in">
          <Link href="/" className="flex items-center px-2 py-2 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-900 dark:text-gray-100 transition-colors">
            <span role="img" aria-label="Chat" className="mr-1">💬</span> Chat
          </Link>
          <Link href="/speak" className="flex items-center px-2 py-2 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-900 dark:text-gray-100 transition-colors">
            <span role="img" aria-label="Audio" className="mr-1">🔊</span> Audio
          </Link>
          <Link href="/review" className="flex items-center px-2 py-2 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-900 dark:text-gray-100 transition-colors">
            <span role="img" aria-label="SRS Review" className="mr-1">📖</span> SRS
          </Link>
          <Link href="/vocab" className="flex items-center px-2 py-2 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-900 dark:text-gray-100 transition-colors">
            <span role="img" aria-label="Vocab Review" className="mr-1">🈳</span> Vocab
          </Link>
          <Link href="/grammar" className="flex items-center px-2 py-2 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-900 dark:text-gray-100 transition-colors">
            <span role="img" aria-label="Grammar Review" className="mr-1">📝</span> Grammar
          </Link>
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <UserInfo />
          </div>
        </div>
      )}
    </header>
  );
} 