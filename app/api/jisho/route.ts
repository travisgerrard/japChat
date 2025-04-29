import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache (per serverless instance)
const cache = new Map<string, { data: unknown, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes
const DELAY_MS = 200; // 200ms delay to avoid hammering Jisho

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('keyword');
  if (!keyword) {
    return NextResponse.json({ error: 'Missing keyword' }, { status: 400 });
  }

  // Check cache
  const cacheKey = keyword;
  const now = Date.now();
  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey)!;
    if (now - timestamp < CACHE_TTL) {
      return NextResponse.json(data);
    } else {
      cache.delete(cacheKey);
    }
  }

  // Add delay to avoid rate limiting
  await new Promise(res => setTimeout(res, DELAY_MS));

  const jishoRes = await fetch(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(keyword)}`,
    { headers: { 'User-Agent': 'JapChat/1.0 (Daddy Long Legs)' } }
  );

  // Check for non-200 or non-JSON
  const contentType = jishoRes.headers.get('content-type') || '';
  if (!jishoRes.ok || !contentType.includes('application/json')) {
    const text = await jishoRes.text();
    return NextResponse.json({ error: 'Jisho API error', status: jishoRes.status, body: text.slice(0, 200) }, { status: 502 });
  }

  const data = await jishoRes.json();
  cache.set(cacheKey, { data, timestamp: now });
  return NextResponse.json(data);
} 