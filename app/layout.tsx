import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from 'next/link';
import UserInfo from './_components/UserInfo';
import { useState } from 'react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JapChat",
  description: "Learn Japanese through chat based stories",
  icons: {
    icon: "/favicon.ico",
  },
};

import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env.local' });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Hamburger menu state (client only)
  const [navOpen, setNavOpen] = useState(false);
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Global Navigation Header */}
        <header className="w-full bg-white dark:bg-gray-800 shadow z-50 sticky top-0">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center px-4 py-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 sm:mb-0">
              Jap-Chat
            </h1>
            {/* Hamburger for mobile */}
            <button
              className="sm:hidden ml-2 p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onClick={() => setNavOpen(!navOpen)}
              aria-label="Toggle navigation menu"
            >
              <svg className="w-6 h-6 text-gray-900 dark:text-gray-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {/* Navigation Links */}
            <nav
              className={`flex-col sm:flex-row items-center w-full sm:w-auto ${navOpen ? 'flex' : 'hidden'} sm:flex mt-4 sm:mt-0`}
            >
              <Link href="/" className="flex items-center px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-900 dark:text-gray-100 transition-colors">
                <span role="img" aria-label="Chat" className="mr-1">💬</span> <span className="hidden sm:inline">Chat</span>
              </Link>
              <Link href="/speak" className="flex items-center px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-900 dark:text-gray-100 transition-colors">
                <span role="img" aria-label="Audio" className="mr-1">🔊</span> <span className="hidden sm:inline">Audio</span>
              </Link>
              <Link href="/review" className="flex items-center px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-900 dark:text-gray-100 transition-colors">
                <span role="img" aria-label="SRS Review" className="mr-1">📖</span> <span className="hidden sm:inline">SRS</span>
              </Link>
              <Link href="/vocab" className="flex items-center px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-900 dark:text-gray-100 transition-colors">
                <span role="img" aria-label="Vocab Review" className="mr-1">🈳</span> <span className="hidden sm:inline">Vocab</span>
              </Link>
              <Link href="/grammar" className="flex items-center px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-900 dark:text-gray-100 transition-colors">
                <span role="img" aria-label="Grammar Review" className="mr-1">📝</span> <span className="hidden sm:inline">Grammar</span>
              </Link>
            </nav>
            <UserInfo />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
