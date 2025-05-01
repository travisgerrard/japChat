import { NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { context } = await request.json();
    const systemPrompt = `Suggest 3 prompts for a Japanese graded reader chat app. Each prompt should request a Tadoku-style story at a specific level, with a Genki chapter, a theme, and a WaniKani level. If the user has previously mentioned a WaniKani level, Genki chapter, or Tadoku level in the context below, use those in your suggestions. Otherwise, pick reasonable values. Format each suggestion like: \"Create a Level 1 story with Genki Chapter 5 grammar and WaniKani Level 10 vocabulary about a picnic.\"\n\nContext:\n${context || ''}\n\nRespond with a JSON array of strings, no extra text.`;
    const response = await streamText({
      model: openai('gpt-4o-mini'),
      messages: [
        { role: 'system', content: systemPrompt },
      ],
    });
    let fullText = '';
    for await (const chunk of response.textStream) {
      fullText += chunk;
    }
    // Try to extract JSON array
    let suggestions: string[] = [];
    try {
      const match = fullText.match(/\[([\s\S]+)\]/);
      if (match) {
        suggestions = JSON.parse('[' + match[1] + ']');
      } else {
        suggestions = JSON.parse(fullText);
      }
    } catch {
      suggestions = [];
    }
    return NextResponse.json({ suggestions });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to generate suggestions', details: String(err) }, { status: 500 });
  }
} 