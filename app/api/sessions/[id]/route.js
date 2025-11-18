// app/api/sessions/[id]/route.js
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// End a session (set ended_at = now)
export async function PATCH(_request, context) {
  const { id: sessionId } = await context.params;

  const { data, error } = await supabaseServer
    .from('sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId)
    .select('id, title, join_code, created_at, started_at, ended_at')
    .single();

  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  return NextResponse.json(data);
}