import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const vocab_word = url.searchParams.get('vocab_word');
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
  if (!vocab_word) {
    return NextResponse.json({ error: 'Missing vocab_word' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from('vocab_story_links')
    .select('*')
    .eq('user_id', user.id)
    .eq('vocab_word', vocab_word)
    .order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json({ error: 'Failed to fetch vocab story links', details: error }, { status: 500 });
  }
  return NextResponse.json({ links: data });
} 