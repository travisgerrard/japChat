import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  return NextResponse.json({ success: true });
} 