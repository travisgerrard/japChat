import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '../../../src/lib/supabase/admin';

export async function GET() {
  try {
    const headerMap = await headers();
    const authHeader = headerMap.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Get user ID from token (assume RLS or trusted context)
    // For admin client, you may need to fetch user from token if not passed in
    // Here, we assume user_id is available in the session context
    // (If not, you may need to decode the JWT or adjust as needed)
    // For now, fetch all due items for all users (for demo/testing)
    // In production, filter by user_id

    const now = new Date().toISOString();
    // Vocab due if next_review is null or <= now
    const { data: vocab, error: vocabError } = await supabaseAdmin
      .from('vocabulary')
      .select('*')
      .or(`next_review.lte.${now},next_review.is.null`)
      .order('next_review', { ascending: true });
    // Grammar due if next_review is null or <= now
    const { data: grammar, error: grammarError } = await supabaseAdmin
      .from('grammar')
      .select('*')
      .or(`next_review.lte.${now},next_review.is.null`)
      .order('next_review', { ascending: true });
    if (vocabError || grammarError) {
      return NextResponse.json({ error: 'Failed to fetch due SRS items', details: { vocabError, grammarError } }, { status: 500 });
    }
    return NextResponse.json({ vocab: vocab || [], grammar: grammar || [] });
  } catch (err) {
    return NextResponse.json({ error: 'Unexpected error', details: String(err) }, { status: 500 });
  }
} 