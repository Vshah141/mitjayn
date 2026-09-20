import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { DEMO_NOTIFICATIONS } from '@/lib/demo';
import { isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  if (!isSupabaseConfigured) return NextResponse.json({ notifications: DEMO_NOTIFICATIONS });
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase.from('notifications').select('*').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(50);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ notifications: data ?? [] });
}
