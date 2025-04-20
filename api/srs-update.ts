import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { v4 as uuidv4 } from 'uuid';

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
    if (!['vocab', 'grammar'].includes(item_type) || !item_id || !['correct', 'incorrect'].includes(result)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    // Fetch item
    const table = item_type === 'vocab' ? 'vocabulary' : 'grammar';
    const { data: item, error: fetchError } = await supabaseAdmin
      .from(table)
      .select('*')
      .eq('id', item_id)
      .maybeSingle();
    if (fetchError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    // SRS logic
    const old_level = item.srs_level ?? 0;
    const old_next_review = item.next_review ?? null;
    let new_level = old_level;
    const new_next_review = new Date();
    if (result === 'correct') {
      new_level = Math.min(old_level + 1, 5); // Cap at 5
      // Spaced intervals: 1, 3, 7, 14, 30 days
      const intervals = [1, 3, 7, 14, 30];
      const days = intervals[Math.min(new_level, intervals.length - 1)];
      new_next_review.setDate(new_next_review.getDate() + days);
    } else {
      new_level = 0;
      new_next_review.setDate(new_next_review.getDate() + 1);
    }
    // Update item
    const { error: updateError } = await supabaseAdmin
      .from(table)
      .update({ srs_level: new_level, next_review: new_next_review })
      .eq('id', item_id);
    if (updateError) {
      return NextResponse.json({ error: 'Failed to update SRS' }, { status: 500 });
    }
    // Log to srs_history
    await supabaseAdmin.from('srs_history').insert({
      id: uuidv4(),
      user_id: item.user_id,
      item_type,
      item_id,
      review_time: new Date(),
      result,
      old_level,
      new_level,
      old_next_review,
      new_next_review,
    });
    // Return updated item
    const { data: updatedItem } = await supabaseAdmin
      .from(table)
      .select('*')
      .eq('id', item_id)
      .maybeSingle();
    return NextResponse.json({ item: updatedItem, srs_level: new_level, next_review: new_next_review });
  } catch (err) {
    return NextResponse.json({ error: 'Unexpected error', details: String(err) }, { status: 500 });
  }
} 