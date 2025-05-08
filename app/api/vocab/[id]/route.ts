import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import jwt from 'jsonwebtoken';
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  // Auth
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
  // Get id from URL
  const id = request.nextUrl.pathname.split('/').pop();
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  // Delete from DB
  const { error } = await supabaseAdmin
    .from('vocabulary')
    .delete()
    .eq('id', id)
    .eq('user_id', user_id);
  if (error) {
    return NextResponse.json({ error: 'Failed to delete vocab', details: error }, { status: 500 });
  }
  return NextResponse.json({ success: true, id });
} 