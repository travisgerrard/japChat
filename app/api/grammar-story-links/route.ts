import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const grammar_point = url.searchParams.get('grammar_point');
  const headerMap = await headers();
  const authHeader = headerMap.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const jwt = authHeader.split(' ')[1];
  const supabaseAuthCheck = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error: authError } = await supabaseAuthCheck.auth.getUser(jwt);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!grammar_point) {
    return NextResponse.json({ error: 'Missing grammar_point' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from('grammar_story_links')
    .select('*')
    .eq('user_id', user.id)
    .eq('grammar_point', grammar_point)
    .order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json({ error: 'Failed to fetch grammar story links', details: error }, { status: 500 });
  }
  return NextResponse.json({ links: data });
} 