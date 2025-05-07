import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { v4 as uuidv4 } from 'uuid';
import { computeNextReview } from '../../../lib/srs';

export async function POST(request: Request) {
  try {
    const headerMap = await headers();
    const authHeader = headerMap.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const jwt = authHeader.split(' ')[1];
    // Parse request body
    const { item_type, item_id, result } = await request.json();
    if (!['vocab', 'grammar', 'audio'].includes(item_type) || !item_id || !['correct', 'incorrect'].includes(result)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    // Fetch item
    let table = '';
    if (item_type === 'vocab') table = 'vocabulary';
    else if (item_type === 'grammar') table = 'grammar';
    else if (item_type === 'audio') table = 'audio_srs'; // For future audio SRS support
    else return NextResponse.json({ error: 'Invalid item_type' }, { status: 400 });

    const { data: item, error: fetchError } = await supabaseAdmin
      .from(table)
      .select('*')
      .eq('id', item_id)
      .maybeSingle();
    if (fetchError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    // SRS logic (shared)
    const old_level = item.srs_level ?? 0;
    const old_next_review = item.next_review ?? null;
    const correct = result === 'correct';
    const { newLevel, nextReview } = computeNextReview(old_level, correct);
    // Update item
    const { error: updateError } = await supabaseAdmin
      .from(table)
      .update({ srs_level: newLevel, next_review: nextReview })
      .eq('id', item_id);
    if (updateError) {
      return NextResponse.json({ error: 'Failed to update SRS' }, { status: 500 });
    }
    // Log to srs_history
    const historyPayload = {
      id: uuidv4(),
      user_id: item.user_id,
      item_type,
      item_id,
      review_time: new Date(),
      result,
      old_level,
      new_level: newLevel,
      old_next_review,
      new_next_review: nextReview,
    };
    const { error: historyError } = await supabaseAdmin.from('srs_history').insert(historyPayload);
    if (historyError) {
      console.error('[SRS] Error inserting into srs_history:', historyError, 'Payload:', historyPayload);
    } else {
      console.log('[SRS] Successfully inserted into srs_history:', historyPayload);
    }
    // Return updated item
    const { data: updatedItem } = await supabaseAdmin
      .from(table)
      .select('*')
      .eq('id', item_id)
      .maybeSingle();
    return NextResponse.json({ item: updatedItem, srs_level: newLevel, next_review: nextReview });
  } catch (err) {
    return NextResponse.json({ error: 'Unexpected error', details: String(err) }, { status: 500 });
  }
} 