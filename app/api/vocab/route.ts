import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import jwt from 'jsonwebtoken';

export async function GET() {
  try {
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
    const { data: vocab, error } = await supabaseAdmin
      .from('vocabulary')
      .select('*')
      .eq('user_id', user_id)
      .order('next_review', { ascending: true });
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch vocab', details: error }, { status: 500 });
    }
    return NextResponse.json({ vocab: vocab || [] });
  } catch (err) {
    return NextResponse.json({ error: 'Unexpected error', details: String(err) }, { status: 500 });
  }
} 