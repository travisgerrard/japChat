import { headers } from 'next/headers'; // Import headers
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // Use standard client

export async function GET(request: Request) {
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

    // Pagination params
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = supabase
      .from('chat_messages')
      .select('id, type:message_type, content, created_at')
      .order('created_at', { ascending: false })
      .limit(limit + 1); // Fetch one extra to check for more

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: messages, error: dbError } = await query;
    if (dbError) {
      console.error("Database error fetching chat history (RLS query):", dbError);
      return NextResponse.json({ error: "Failed to fetch chat history" }, { status: 500 });
    }

    const hasMore = messages.length > limit;
    const messagesToReturn = hasMore ? messages.slice(0, -1) : messages;
    const nextCursor = messagesToReturn.length > 0 ? messagesToReturn[messagesToReturn.length - 1].created_at : null;

    return NextResponse.json({
      messages: messagesToReturn,
      nextCursor,
      hasMore
    });
  } catch (error) {
    console.error("Server error fetching chat history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}