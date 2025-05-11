import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import type { User } from '@supabase/auth-js';

/**
 * Authenticates a Next.js API request using Supabase JWT from the Authorization header.
 * @returns {Promise<{ user: User | null, error: string | null }>} The authenticated user object or an error.
 */
export async function authenticateRequest(request: Request): Promise<{ user: User | null, error: string | null }> {
  const headerMap = await headers();
  const authHeader = headerMap.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Unauthorized: Missing or invalid token' };
  }
  const jwt = authHeader.split(' ')[1];

  const supabaseAuthCheck = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user }, error } = await supabaseAuthCheck.auth.getUser(jwt);
  if (error || !user) {
    return { user: null, error: error?.message || 'Unauthorized' };
  }
  return { user, error: null };
} 