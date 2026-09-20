import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { adminSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const expected = process.env.LAB_STAFF_API_KEY;
  if (!expected || req.headers.get('x-lab-staff-key') !== expected) return NextResponse.json({ error: 'Unauthorized lab staff request.' }, { status: 401 });
  const admin = adminSupabase();
  if (!admin) return NextResponse.json({ error: 'Server-side Supabase credentials are not configured.' }, { status: 503 });
  const form = await req.formData();
  const file = form.get('file');
  const profileId = String(form.get('profile_id') || '');
  const labId = String(form.get('lab_id') || '');
  const diseaseName = String(form.get('disease_name') || '');
  const status = String(form.get('status') || '');
  const reportDate = String(form.get('report_date') || '');
  if (!(file instanceof File) || file.type !== 'application/pdf') return NextResponse.json({ error: 'A PDF report file is required.' }, { status: 400 });
  if (!profileId || !labId || !diseaseName || !reportDate || !['verified_negative','not_found','not_updated','detected_positive'].includes(status)) return NextResponse.json({ error: 'Missing or invalid report fields.' }, { status: 400 });

  const verificationCode = crypto.randomBytes(18).toString('base64url');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const verifyUrl = `${appUrl}/verify-report/${verificationCode}`;
  const input = new Uint8Array(await file.arrayBuffer());
  const pdf = await PDFDocument.load(input);
  const page = pdf.getPages()[0];
  const qrPng = await QRCode.toBuffer(verifyUrl, { type: 'png', width: 220, margin: 1, errorCorrectionLevel: 'M' });
  const qr = await pdf.embedPng(qrPng);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const size = 92;
  const x = Math.max(24, page.getWidth() - size - 34);
  const y = 32;
  page.drawRectangle({ x: x - 10, y: y - 10, width: size + 20, height: size + 38, color: rgb(1,1,1), borderColor: rgb(.82,.85,.83), borderWidth: 1 });
  page.drawImage(qr, { x, y: y + 20, width: size, height: size });
  page.drawText('Scan to check report authenticity', { x: x - 4, y: y + 4, size: 7.5, font, color: rgb(.18,.28,.23) });
  const output = Buffer.from(await pdf.save());
  const fileHash = crypto.createHash('sha256').update(output).digest('hex');
  const path = `${profileId}/${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await admin.storage.from('reports').upload(path, output, { contentType: 'application/pdf', upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });
  const { data, error } = await admin.from('disease_reports').insert({ profile_id: profileId, disease_name: diseaseName, status, lab_id: labId, report_date: reportDate, report_file_url: path, report_verification_code: verificationCode, report_file_hash: fileHash, source_type: 'lab_issued', verification_state: 'verified' }).select('id,report_verification_code').single();
  if (error) {
    await admin.storage.from('reports').remove([path]);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ report: data, verify_url: verifyUrl }, { status: 201 });
}
