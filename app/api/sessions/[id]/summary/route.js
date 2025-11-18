// app/api/sessions/[id]/summary/route.js
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(request, context) {
  const { id: sessionId } = await context.params; // params is a Promise in Next 16

  const { searchParams } = new URL(request.url);
  const bucketSize = parseInt(searchParams.get('bucket') || '5', 10);

  const { data: events, error } = await supabaseServer
    .from('events')
    .select('control_id, t_offset_sec, value, is_valid')
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

  return NextResponse.json({
    bucketSize,
    buttonSeries,
    sliderSeries
  });
}