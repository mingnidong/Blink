// app/api/sessions/[id]/events/route.js
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request, context) {
  const { id: sessionId } = await context.params; // params is a Promise

  const body = await request.json();
  const { controlId, value, userId } = body;

  if (!controlId || !userId) {
    return new NextResponse('Missing controlId or userId', { status: 400 });
  }

  const { data: session, error: sErr } = await supabaseServer
    .from('sessions')
    .select('started_at')
    .eq('id', sessionId)
    .maybeSingle();

  if (sErr || !session || !session.started_at) {
    return new NextResponse('Session not started', { status: 400 });
  }

  const tOffsetSec = Math.floor(
    (Date.now() - new Date(session.started_at).getTime()) / 1000
  );

  const { error: eErr } = await supabaseServer.from('events').insert({
    session_id: sessionId,
    control_id: controlId,
    user_id: userId,
    t_offset_sec: tOffsetSec,
    value: value ?? 1,
    client_ts: new Date().toISOString()
  });

  if (eErr) {
    return new NextResponse(eErr.message, { status: 500 });
  }

  return NextResponse.json({ ok: true, tOffsetSec });
}