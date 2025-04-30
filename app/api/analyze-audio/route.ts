import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Use edge runtime for faster response

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audio = formData.get('audio') as File | null;
  const target = formData.get('target') as string | null;
  if (!audio || !target) {
    return NextResponse.json({ error: 'Missing audio or target' }, { status: 400 });
  }

  // Send audio to OpenAI Whisper (replace with your OpenAI key and endpoint)
  const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: (() => {
      const fd = new FormData();
      fd.append('file', audio, 'audio.webm');
      fd.append('model', 'whisper-1');
      fd.append('response_format', 'text');
      return fd;
    })(),
  });
  if (!openaiRes.ok) {
    const text = await openaiRes.text();
    return NextResponse.json({ error: 'OpenAI error', status: openaiRes.status, body: text.slice(0, 200) }, { status: 502 });
  }
  const transcription = await openaiRes.text();

  // (Optional) Use OpenAI GPT to compare transcription to target and return similarity/feedback
  // For now, just return the transcription
  return NextResponse.json({ transcription });
} 