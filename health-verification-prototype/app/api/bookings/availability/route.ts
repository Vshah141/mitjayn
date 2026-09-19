import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { adminSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { DEMO_BOOKINGS } from '@/lib/demo';

export async function GET(req: NextRequest) {
  const labId = req.nextUrl.searchParams.get('labId');
  const date = req.nextUrl.searchParams.get('date');
  if (!labId || !date) return NextResponse.json({ error: 'Missing query.' }, { status: 400 });
  if (!isSupabaseConfigured) {
    const base = ['09:00 AM','03:30 PM'];
    const booked = DEMO_BOOKINGS.filter(b => b.lab_id === labId && b.booking_date === date && b.status === 'booked').map(b => b.time_slot);
    return NextResponse.json({ taken: Array.from(new Set([...base, ...booked])) });
  }
  const userClient = createRouteHandlerClient({ cookies });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = adminSupabase();
  if (!admin) return NextResponse.json({ error: 'Server storage configuration is incomplete.' }, { status: 503 });
  const { data, error } = await admin.from('bookings').select('time_slot').eq('lab_id', labId).eq('booking_date', date).neq('status', 'cancelled');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ taken: (data || []).map((x: any) => x.time_slot) });
}
