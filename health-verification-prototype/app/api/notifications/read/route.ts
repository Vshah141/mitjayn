import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { isSupabaseConfigured } from '@/lib/supabase';

export async function POST() {
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true });
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('profile_id', user.id).is('read_at', null);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}
