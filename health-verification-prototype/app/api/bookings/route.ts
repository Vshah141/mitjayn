import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { adminSupabase, isSupabaseConfigured } from '@/lib/supabase';

const allowedSlots = new Set(['08:00 AM','09:00 AM','10:30 AM','11:30 AM','01:00 PM','02:00 PM','03:30 PM','04:30 PM','05:30 PM','06:30 PM']);

export async function POST(req: Request) {
  const body = await req.json();
  const { lab_id, report_name, report_description = '', booking_date, time_slot } = body;
  if (!lab_id || !report_name || !booking_date || !allowedSlots.has(time_slot)) return NextResponse.json({ error: 'Invalid booking details.' }, { status: 400 });
  if (!isSupabaseConfigured) return NextResponse.json({ booking: { id: 'demo-' + Date.now(), ...body, status: 'booked' } });

  const s = createRouteHandlerClient({ cookies });
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = adminSupabase();
  if (!admin) return NextResponse.json({ error: 'Server configuration is incomplete.' }, { status: 503 });
  const { data: existing } = await admin.from('bookings').select('id').eq('lab_id', lab_id).eq('booking_date', booking_date).eq('time_slot', time_slot).neq('status', 'cancelled').maybeSingle();
  if (existing) return NextResponse.json({ error: 'That slot was just booked. Choose another time.' }, { status: 409 });
  const { data, error } = await s.from('bookings').insert({ profile_id: user.id, lab_id, report_name, report_description, booking_date, time_slot, status: 'booked' }).select().single();
  if (error?.code === '23505') return NextResponse.json({ error: 'That slot was just booked. Choose another time.' }, { status: 409 });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ booking: data });
}
