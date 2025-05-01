import { NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { context } = await request.json();
    const systemPrompt = `Suggest 3 engaging prompts for a Japanese language learning chat app. Base your suggestions on the following context (if any):\n${context || ''}\nRespond with a JSON array of strings, no extra text.`;
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