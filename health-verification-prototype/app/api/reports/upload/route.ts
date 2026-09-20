import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { adminSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { extractReportText, parseReportText } from '@/lib/report-extraction';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/jpg']);

function validMagicBytes(buffer: Buffer, type: string) {
  if (type === 'application/pdf') return buffer.subarray(0, 4).toString() === '%PDF';
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Report uploads require the configured Supabase deployment.' }, { status: 501 });

  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const path = String(body?.path || '');
  const originalName = String(body?.original_name || 'report');
  const contentType = String(body?.content_type || '');
  if (!path.startsWith(`${user.id}/uploads/`) || !ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json({ error: 'Invalid uploaded report reference.' }, { status: 400 });
  }

  const admin = adminSupabase();
  if (!admin) return NextResponse.json({ error: 'Server-side Supabase credentials are not configured.' }, { status: 503 });

  const { data: storedFile, error: downloadError } = await admin.storage.from('reports').download(path);
  if (downloadError || !storedFile) return NextResponse.json({ error: 'Uploaded report could not be read from storage.' }, { status: 404 });
  if (storedFile.size === 0 || storedFile.size > MAX_FILE_SIZE) {
    await admin.storage.from('reports').remove([path]);
    return NextResponse.json({ error: 'Report must be between 1 byte and 10 MB.' }, { status: 400 });
  }

  const raw = Buffer.from(await storedFile.arrayBuffer());
  if (!validMagicBytes(raw, contentType)) {
    await admin.storage.from('reports').remove([path]);
    return NextResponse.json({ error: 'The uploaded file content does not match its PDF/JPG type.' }, { status: 400 });
  }

  const file = new File([raw], originalName, { type: contentType === 'image/jpg' ? 'image/jpeg' : contentType });
  let text = '';
  try {
    text = await extractReportText(file);
  } catch (error: any) {
    await admin.storage.from('reports').remove([path]);
    return NextResponse.json({ error: error?.message || 'Could not read this report.' }, { status: 422 });
  }

  const extracted = parseReportText(text);
  if (!extracted.disease_name) {
    await admin.storage.from('reports').remove([path]);
    return NextResponse.json({ error: 'Could not identify a supported disease in this report. Supported: Covid-19, Monkeypox/Mpox, Dengue, Malaria and Swine Flu/H1N1.' }, { status: 422 });
  }

  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const verificationCode = crypto.randomBytes(18).toString('base64url');
  const { data: report, error: reportError } = await admin.from('disease_reports').insert({
    profile_id: user.id,
    disease_name: extracted.disease_name,
    status: extracted.extracted_status || 'not_updated',
    lab_id: null,
    report_date: extracted.report_date || new Date().toISOString().slice(0, 10),
    report_file_url: path,
    report_verification_code: verificationCode,
    report_file_hash: hash,
    source_type: 'user_upload',
    verification_state: 'pending',
    extracted_metadata: extracted
  }).select('*').single();

  if (reportError) {
    await admin.storage.from('reports').remove([path]);
    return NextResponse.json({ error: reportError.message }, { status: 400 });
  }

  const profileUpdate: Record<string, string | number> = {};
  if (extracted.patient_name) profileUpdate.name = extracted.patient_name;
  if (typeof extracted.age === 'number') profileUpdate.age = extracted.age;
  if (extracted.gender) profileUpdate.gender = extracted.gender;
  if (extracted.date_of_birth) profileUpdate.date_of_birth = extracted.date_of_birth;
  if (extracted.mobile_number) profileUpdate.mobile_number = extracted.mobile_number;

  let updatedProfile = null;
  if (Object.keys(profileUpdate).length) {
    const { data, error } = await admin.from('profiles').update(profileUpdate).eq('id', user.id).select('*').single();
    if (!error) updatedProfile = data;
  }

  return NextResponse.json({
    report,
    extracted,
    profile: updatedProfile,
    message: 'Report uploaded and parsed. It is visible on your profile but remains pending verification until a trusted lab verifies it.'
  }, { status: 201 });
}
