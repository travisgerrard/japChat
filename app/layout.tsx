import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from './_components/Header';
import SWRProvider from './_components/SWRProvider';
import { getUser } from '../lib/supabase/server';

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();
  const email = user?.email ?? null;
  console.log('[Daddy Long Legs] RootLayout rendered');
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-[#f9f6f2] dark:bg-gray-900 transition-colors duration-300`}
      >
        <SWRProvider>
          <Header email={email} />
          {children}
        </SWRProvider>
      </body>
    </html>
  );
}
