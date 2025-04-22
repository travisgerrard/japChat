import { headers } from 'next/headers'; // Import headers
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // Use standard client

import type { ChatMessage } from '@/app/_components/ChatWindow';

export async function GET() {
  const headerMap = await headers(); // Await the headers() call itself
  const authHeader = headerMap.get('Authorization'); // Get header from the awaited result

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log("Missing or invalid Authorization header.");
    return NextResponse.json({ error: "Unauthorized: Missing or invalid token" }, { status: 401 });
  }

  const jwt = authHeader.split(' ')[1]; // Extract the token

  // Create a standard Supabase client, explicitly setting the auth header
  // This might help ensure the session context is correctly picked up for RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { // Add client options
      global: {
        headers: { Authorization: `Bearer ${jwt}` }, // Pass the JWT
      },
    }
  );

  try {
    // Verify user authentication (still good practice, even with header set)
    // Now we can use getUser() without the token argument as it's set globally for this client instance
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error fetching chat history (header token):", authError);
      // Log the specific error if available
      if (authError) console.error("Supabase auth error:", authError.message);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`History route: Authenticated user ID: ${user.id}`); // Log user ID

    // --- RLS Bypass Check (Admin Client) ---
    try {
      const { data: adminMessages, error: adminError } = await supabaseAdmin
        .from('chat_messages')
        .select('id, type:message_type, content')
        .eq('user_id', user.id) // Filter specifically for this user
        .order('created_at', { ascending: true });

      if (adminError) {
        console.error("Admin client query error:", adminError);
      } else {
        console.log(`Admin client query result for user ${user.id}:`, adminMessages); // Log admin result
      }
    } catch (adminCatchError) {
      console.error("Exception during admin client query:", adminCatchError);
    }
    // --- End RLS Bypass Check ---

    // --- Original RLS-Enabled Query ---
    console.log("Now performing RLS-enabled query...");
    const { data: messages, error: dbError } = await supabase // Use the RLS-enabled client
      .from('chat_messages')
      .select('id, type:message_type, content') // Select id, map message_type to type, select content
      .order('created_at', { ascending: true }); // Rely on RLS policy for filtering

    console.log(`RLS-enabled query raw result for user ${user.id}:`, messages); // Log raw query result

    if (dbError) {
      console.error("Database error fetching chat history (RLS query):", dbError);
      return NextResponse.json({ error: "Failed to fetch chat history" }, { status: 500 });
    }

    // Log before returning
    console.log(`Returning ${messages?.length ?? 0} messages for user ${user.id}`);
    return NextResponse.json(messages || [], { status: 200 });

  } catch (error) {
    console.error("Server error fetching chat history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}