import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // --- Authentication ---
    const headerMap = await headers();
    const authHeader = headerMap.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const jwt = authHeader.split(' ')[1];
    // Create a standard Supabase client for auth check
    const supabaseAuthCheck = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authError } = await supabaseAuthCheck.auth.getUser(jwt);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- Parse JSON body ---
    let data;
    try {
      data = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const { title, japanese_text, english_text, vocab_notes, grammar_notes, chat_message_id } = data;
    if (!title || !japanese_text || !english_text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const now = new Date();
    const nextReview = now;
    // --- Insert story ---
    const storyId = chat_message_id || uuidv4();
    try {
      const { error: storyInsertError } = await supabaseAdmin.from('stories').insert({
        id: storyId,
        user_id: user.id,
        title,
        japanese_text,
        english_text,
        chat_message_id: chat_message_id || null,
        created_at: now,
      });
      if (storyInsertError) throw storyInsertError;
    } catch (err) {
      return NextResponse.json({ error: 'Failed to insert story', details: String(err) }, { status: 500 });
    }
    // --- Insert vocab ---
    if (Array.isArray(vocab_notes)) {
      for (const v of vocab_notes) {
        const { word, kanji, reading, meaning, context_sentence } = v;
        if (!word || !reading || !meaning) continue;
        let retries = 2;
        while (retries > 0) {
          try {
            const { data: existingVocab, error: vocabCheckError } = await supabaseAdmin
              .from('vocabulary')
              .select('id')
              .eq('user_id', user.id)
              .eq('word', word)
              .maybeSingle();
            if (vocabCheckError) throw vocabCheckError;
            if (!existingVocab) {
              const { error: vocabInsertError } = await supabaseAdmin.from('vocabulary').insert({
                id: uuidv4(),
                user_id: user.id,
                word,
                kanji,
                reading,
                meaning,
                context_sentence,
                chat_message_id: storyId,
                srs_level: 0,
                next_review: nextReview,
              });
              if (vocabInsertError) throw vocabInsertError;
            }
            break;
          } catch (err) {
            retries--;
            if (retries === 0) {
              console.error('[SRS] Failed to insert vocab after retries:', word, err);
            } else {
              await new Promise(res => setTimeout(res, 500));
            }
          }
        }
      }
    }
    // --- Insert grammar ---
    if (Array.isArray(grammar_notes)) {
      for (const g of grammar_notes) {
        const { grammar_point, label, explanation, story_usage, narrative_connection, example_sentence } = g;
        if (!grammar_point || !explanation) continue;
        let retries = 2;
        while (retries > 0) {
          try {
            const { data: existingGrammar, error: grammarCheckError } = await supabaseAdmin
              .from('grammar')
              .select('id, explanation')
              .eq('user_id', user.id)
              .eq('grammar_point', grammar_point)
              .eq('label', label)
              .maybeSingle();
            if (grammarCheckError) throw grammarCheckError;
            let shouldInsert = true;
            if (existingGrammar) {
              const existingExp = (existingGrammar.explanation || '').trim().toLowerCase();
              const newExp = (explanation || '').trim().toLowerCase();
              if (existingExp === newExp || existingExp.includes(newExp) || newExp.includes(existingExp)) {
                shouldInsert = false;
              }
            }
            if (shouldInsert) {
              const { error: grammarInsertError } = await supabaseAdmin.from('grammar').insert({
                id: uuidv4(),
                user_id: user.id,
                grammar_point,
                label,
                explanation,
                story_usage,
                narrative_connection,
                example_sentence: example_sentence || '',
                chat_message_id: storyId,
                srs_level: 0,
                next_review: nextReview,
              });
              if (grammarInsertError) throw grammarInsertError;
            }
            break;
          } catch (err) {
            retries--;
            if (retries === 0) {
              console.error('[SRS] Failed to insert grammar after retries:', grammar_point, err);
            } else {
              await new Promise(res => setTimeout(res, 500));
            }
          }
        }
      }
    }
    return NextResponse.json({ success: true, storyId });
  } catch (err) {
    return NextResponse.json({ error: 'Unexpected error', details: String(err) }, { status: 500 });
  }
} 