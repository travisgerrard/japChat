"use client";
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import UserInfo from './UserInfo';

const navLinks = [
  { href: '/', label: 'Chat', icon: '💬' },
  { href: '/speak', label: 'Audio', icon: '🔊' },
  { href: '/review', label: 'SRS', icon: '📖' },
  { href: '/review/audio', label: 'Audio SRS', icon: '🎤' },
  { href: '/vocab', label: 'Vocab', icon: '🈳' },
  { href: '/grammar', label: 'Grammar', icon: '📝' },
];

export default function Header() {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
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
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center px-2 py-1 rounded transition-colors ${
                pathname === link.href
                  ? 'bg-indigo-200 dark:bg-indigo-700 font-bold underline text-indigo-900 dark:text-white'
                  : 'hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-900 dark:text-gray-100'
              }`}
            >
              <span role="img" aria-label={link.label} className="mr-1">{link.icon}</span> {link.label}
            </Link>
          ))}
          <UserInfo />
        </nav>
      </div>
      {/* Mobile Dropdown Menu */}
      {navOpen && (
        <div className="sm:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-md px-4 py-4 flex flex-col gap-4 animate-fade-in">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center px-2 py-2 rounded transition-colors ${
                pathname === link.href
                  ? 'bg-indigo-200 dark:bg-indigo-700 font-bold underline text-indigo-900 dark:text-white'
                  : 'hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-900 dark:text-gray-100'
              }`}
            >
              <span role="img" aria-label={link.label} className="mr-1">{link.icon}</span> {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <UserInfo />
          </div>
        </div>
      )}
    </header>
  );
} 