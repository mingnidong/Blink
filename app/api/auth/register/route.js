// app/api/auth/register/route.js
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request) {
  const body = await request.json();
  const { email, displayName } = body;

  if (!email) {
    return new NextResponse('Missing email', { status: 400 });
  }

  // Look for existing profile by email
  const { data: existing, error: selectErr } = await supabaseServer
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (selectErr) {
    return new NextResponse(selectErr.message, { status: 500 });
  }

  if (existing) {
    if (displayName && existing.display_name !== displayName) {
      const { error: updateErr } = await supabaseServer
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', existing.id);

      if (updateErr) {
        return new NextResponse(updateErr.message, { status: 500 });
      }

      existing.display_name = displayName;
    }
    return NextResponse.json(existing);
  }

  // Insert new profile
  const { data: inserted, error: insertErr } = await supabaseServer
    .from('profiles')
    .insert({
      email,
      display_name: displayName || null
    })
    .select()
    .single();

  if (insertErr) {
    return new NextResponse(insertErr.message, { status: 500 });
  }

  return NextResponse.json(inserted);
}