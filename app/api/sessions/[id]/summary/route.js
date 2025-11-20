// app/api/sessions/[id]/summary/route.js
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(request, context) {
  const { id: sessionId } = await context.params; // params is a Promise in Next 16

  const { searchParams } = new URL(request.url);
  const bucketSize = parseInt(searchParams.get('bucket') || '5', 10);

  const { data: events, error } = await supabaseServer
    .from('events')
    .select('control_id, t_offset_sec, value, is_valid, user_id')
    .eq('session_id', sessionId);

  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  const buttonMap = new Map();
  const sliderMap = new Map();

  for (const ev of events || []) {
    if (ev.is_valid === false) continue;
    const bucket = Math.floor(ev.t_offset_sec / bucketSize);
    const key = `${ev.control_id}:${bucket}`;

    if (ev.value == null || Number(ev.value) === 1) {
      buttonMap.set(key, (buttonMap.get(key) || 0) + 1);
    } else {
      const prev = sliderMap.get(key) || { sum: 0, n: 0 };
      prev.sum += Number(ev.value);
      prev.n += 1;
      sliderMap.set(key, prev);
    }
  }

  const buttonSeries = [];
  for (const [key, count] of buttonMap.entries()) {
    const [controlId, bucket] = key.split(':').map(Number);
    buttonSeries.push({ controlId, bucket, count });
  }

  const sliderSeries = [];
  for (const [key, agg] of sliderMap.entries()) {
    const [controlId, bucket] = key.split(':').map(Number);
    sliderSeries.push({
      controlId,
      bucket,
      avgValue: agg.sum / agg.n,
      n: agg.n
    });
  }

  // Build participant list from session_participants (who explicitly joined)
  const { data: spRows, error: spErr } = await supabaseServer
    .from('session_participants')
    .select('user_id')
    .eq('session_id', sessionId);

  const participantMap = new Map();
  const participantIds = [];
  if (!spErr && Array.isArray(spRows) && spRows.length > 0) {
    for (const r of spRows) {
      if (r.user_id) {
        participantMap.set(r.user_id, 0); // initialize count to 0
        participantIds.push(r.user_id);
      }
    }
  }

  // Count button presses only for users who joined (session_participants)
  for (const ev of events || []) {
    if (ev.is_valid === false) continue;
    const isButton = ev.value == null || Number(ev.value) === 1;
    if (!isButton) continue;
    const uid = ev.user_id;
    if (!uid) continue;
    if (participantMap.has(uid)) {
      participantMap.set(uid, (participantMap.get(uid) || 0) + 1);
    }
  }

  const participants = [];
  if (participantIds.length > 0) {
    const { data: profiles, error: pErr } = await supabaseServer
      .from('profiles')
      .select('id, email, display_name')
      .in('id', participantIds);

    const profMap = new Map();
    if (!pErr && profiles) {
      for (const p of profiles) profMap.set(p.id, p);
    }

    for (const uid of participantIds) {
      const p = profMap.get(uid) || { id: uid, email: null, display_name: null };
      participants.push({ userId: uid, email: p.email, displayName: p.display_name, count: participantMap.get(uid) || 0 });
    }
  }

  return NextResponse.json({
    bucketSize,
    buttonSeries,
    sliderSeries
    ,participants
  });
}