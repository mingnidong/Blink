// app/api/sessions/route.js
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import crypto from 'crypto';

// List sessions for a host
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const hostUserId = searchParams.get('hostUserId');

  if (!hostUserId) {
    return new NextResponse('Missing hostUserId', { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('sessions')
    .select('id, title, join_code, created_at, started_at, ended_at')
    .eq('host_user_id', hostUserId)
    .order('created_at', { ascending: false });

  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  return NextResponse.json(data || []);
}

// Create a new session
export async function POST(request) {
  const body = await request.json();
  const { hostUserId, title, description, controls } = body;

  if (!hostUserId || !title) {
    return new NextResponse('Missing hostUserId or title', { status: 400 });
  }

  const joinCode = crypto.randomBytes(3).toString('hex').toUpperCase();

  const { data: session, error: sErr } = await supabaseServer
    .from('sessions')
    .insert({
      host_user_id: hostUserId,
      title,
      description: description || null,
      join_code: joinCode,
      started_at: new Date().toISOString() // start immediately for MVP
    })
    .select()
    .single();

  if (sErr || !session) {
    return new NextResponse(sErr?.message || 'Session insert failed', {
      status: 500
    });
  }

  if (Array.isArray(controls) && controls.length > 0) {
    const rows = controls.map((c, idx) => ({
      session_id: session.id,
      control_type: c.controlType,
      label: c.label,
      slug: c.slug || c.label.toLowerCase().replace(/\s+/g, '-'),
      min_value: c.minValue ?? null,
      max_value: c.maxValue ?? null,
      step: c.step ?? null,
      default_value: c.defaultValue ?? null,
      order_index: idx
    }));

    const { error: cErr } = await supabaseServer
      .from('session_controls')
      .insert(rows);

    if (cErr) {
      return new NextResponse(cErr.message, { status: 500 });
    }
  }

  return NextResponse.json({
    sessionId: session.id,
    joinCode: session.join_code
  });
}