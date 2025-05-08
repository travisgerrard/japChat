import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.pathname.split('/').pop();
  return NextResponse.json({ success: true, id });
} 