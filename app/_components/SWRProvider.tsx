'use client';

import { SWRConfig, Cache, State } from 'swr';
import React, { useEffect, useState } from 'react';

// Singleton cache instance
const swrCache: Cache = (() => {
  if (typeof window !== 'undefined') {
    const entries = JSON.parse(localStorage.getItem('swr-cache') || '[]') as [string, State<unknown, unknown>][];
    const map = new Map<string, State<unknown, unknown>>(entries);
    window.addEventListener('beforeunload', () => {
      localStorage.setItem('swr-cache', JSON.stringify(Array.from(map.entries())));
    });
    return map;
  }
  return new Map();
})();

function getSWRFallback(): Record<string, unknown> {
  const fallback: Record<string, unknown> = {};
  for (const [key, value] of (swrCache as Map<string, unknown>).entries()) {
    if (key.startsWith('/api/chat/history')) {
      fallback[key] = value;
    }
  }
  return fallback;
}

export default function SWRProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);
  const [fallback, setFallback] = useState<Record<string, unknown>>({});
  useEffect(() => {
    setIsClient(true);
    setFallback(getSWRFallback());
  }, []);
  if (!isClient) {
    return <>{children}</>;
  }
  return (
    <SWRConfig value={{ provider: () => swrCache, fallback }}>
      {children}
    </SWRConfig>
  );
} 