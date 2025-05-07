import { NextResponse, NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '../../../../src/lib/supabase/admin';
import jwt from 'jsonwebtoken';

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params;
  const headerMap = await headers();
  const authHeader = headerMap.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];
  let user_id = null;
  try {
    const decoded = jwt.decode(token);
    user_id = decoded?.sub;
  } catch (e) {}
  if (!user_id) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  // Ensure the vocab entry belongs to the user
  const { data: vocab, error: fetchError } = await supabaseAdmin
    .from('vocabulary')
    .select('id')
    .eq('id', id)
    .eq('user_id', user_id)
    .maybeSingle();
  if (fetchError || !vocab) {
    return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
  }
  const { error } = await supabaseAdmin
    .from('vocabulary')
    .delete()
    .eq('id', id)
    .eq('user_id', user_id);
  if (error) {
    return NextResponse.json({ error: 'Failed to delete vocab', details: error }, { status: 500 });
  }
  // Delete related SRS data
  await supabaseAdmin.from('srs_history').delete().eq('item_type', 'vocab').eq('item_id', id).eq('user_id', user_id);
  await supabaseAdmin.from('review_queue').delete().eq('word_id', id).eq('user_id', user_id);
  return NextResponse.json({ success: true });
} 