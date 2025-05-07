import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '../../../../src/lib/supabase/admin';
import jwt from 'jsonwebtoken';

export async function DELETE(request: Request, context: { params: { id: string } }) {
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
  // Ensure the grammar entry belongs to the user
  const { data: grammar, error: fetchError } = await supabaseAdmin
    .from('grammar')
    .select('id')
    .eq('id', id)
    .eq('user_id', user_id)
    .maybeSingle();
  if (fetchError || !grammar) {
    return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
  }
  const { error } = await supabaseAdmin
    .from('grammar')
    .delete()
    .eq('id', id)
    .eq('user_id', user_id);
  if (error) {
    return NextResponse.json({ error: 'Failed to delete grammar', details: error }, { status: 500 });
  }
  // Delete related SRS data
  await supabaseAdmin.from('srs_history').delete().eq('item_type', 'grammar').eq('item_id', id).eq('user_id', user_id);
  return NextResponse.json({ success: true });
} 