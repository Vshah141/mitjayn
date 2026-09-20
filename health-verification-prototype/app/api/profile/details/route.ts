import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { isSupabaseConfigured } from '@/lib/supabase';

const ALLOWED_GENDERS = new Set([
  'Male',
  'Female',
  'Other',
  'Prefer not to say'
]);

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const age =
    body?.age === null ||
    body?.age === '' ||
    body?.age === undefined
      ? null
      : Number(body.age);

  const gender =
    typeof body?.gender === 'string' && body.gender.trim()
      ? body.gender.trim()
      : null;

  if (
    age !== null &&
    (!Number.isInteger(age) || age < 0 || age > 130)
  ) {
    return NextResponse.json(
      { error: 'Age must be a whole number between 0 and 130.' },
      { status: 400 }
    );
  }

  if (gender !== null && !ALLOWED_GENDERS.has(gender)) {
    return NextResponse.json(
      { error: 'Invalid gender value.' },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({
      profile: { age, gender }
    });
  }

  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      age,
      gender
    })
    .eq('id', user.id)
    .select('age, gender')
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    profile: data
  });
}