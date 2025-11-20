// app/api/sessions/[id]/participants/route.js
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request, context) {
  const { id: sessionId } = await context.params;
  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    return new NextResponse('Missing userId', { status: 400 });
  }

  // Upsert into session_participants (create if not exists, update last_seen_at)
  const payload = {
    session_id: sessionId,
    user_id: userId,
    last_seen_at: new Date().toISOString()
  };

  const { data, error } = await supabaseServer
    .from('session_participants')
    .upsert(payload, { onConflict: ['session_id', 'user_id'] })
    .select()
    .single();

  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  return NextResponse.json(data);
}
