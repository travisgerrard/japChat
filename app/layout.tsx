import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from 'next/link';
import UserInfo from './_components/UserInfo';

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
            <nav className="flex flex-wrap gap-2 sm:gap-4 items-center">
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
