import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from 'next/link';
import UserInfo from './_components/UserInfo';
import { useState } from 'react';
import Header from './_components/Header';

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
        <Header />
        {children}
      </body>
    </html>
  );
}
