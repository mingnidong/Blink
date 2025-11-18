// app/api/sessions/by-code/[code]/route.js
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(_request, context) {
  const { code } = await context.params; // params is a Promise

  const { data: session, error: sErr } = await supabaseServer
    .from('sessions')
    .select('id, title, host_user_id, started_at')
    .eq('join_code', code)
    .maybeSingle();

  if (sErr || !session) {
    return new NextResponse('Session not found', { status: 404 });
  }

  const { data: controls, error: cErr } = await supabaseServer
    .from('session_controls')
    .select(
      'id, control_type, label, slug, min_value, max_value, step, default_value, order_index'
    )
    .eq('session_id', session.id)
    .order('order_index', { ascending: true });

  if (cErr) {
    return new NextResponse(cErr.message, { status: 500 });
  }

  return NextResponse.json({
    sessionId: session.id,
    title: session.title,
    hostUserId: session.host_user_id,
    startedAt: session.started_at,
    controls: controls || []
  });
}